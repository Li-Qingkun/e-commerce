// 定义受保护的超级管理员账户
const PROTECTED_ADMIN_USER = 'admin';

// 页面映射表 - 新增：维护页面标识和路径的对应关系
const PAGE_MAP = {
	'user-management': {
		path: '仪表盘 / 用户管理'
	},
	'menu-management': {
		path: '仪表盘 / 菜单管理'
	},
	'permission-config': {
		path: '仪表盘 / 菜单权限配置'
	},
	'data-analysis': {
		path: '仪表盘 / 数据分析'
	},
	'recharge-records': {
		path: '仪表盘 / 会员充值记录'
	},
	'operation-log': {
		path: '仪表盘 / 操作日志'
	}
};

// 默认页面
const DEFAULT_PAGE = 'user-management';

$(document).ready(function() {
	// 验证管理员权限
	const isAdmin = localStorage.getItem('isAdmin');
	if (isAdmin !== 'true') {
		alert('无管理员权限，请登录！');
		window.location.href = 'login.html';
		return;
	}

	// 初始化页面：直接从Hash初始化，不先加载默认页
	initPage();

	// 监听Hash变化
	window.addEventListener('hashchange', handleHashChange);
});

function initPage() {
	// 1. 从URL Hash获取当前页面，没有则用默认页
	const initialPage = getCurrentPageFromHash() || DEFAULT_PAGE;
	const initialPath = PAGE_MAP[initialPage].path;

	// 2. 先更新菜单选中状态，再加载页面，避免双重选中
	$('.menu-item').removeClass('active');
	$(`.menu-item[data-page="${initialPage}"]`).addClass('active');

	// 3. 直接加载目标页面，不先加载默认页
	loadPage(initialPage, initialPath);

	// 4. 菜单点击事件（所有菜单项）
	$('.menu-item').click(function(e) {
		if ($(this).hasClass('has-sub')) {
			$(this).toggleClass('open');
			$(this).next('.sub-menu').toggleClass('open');
			e.stopPropagation();
			return;
		}

		$('.menu-item').removeClass('active');
		$(this).addClass('active');

		const pageName = $(this).data('page');
		const pagePath = $(this).data('path');

		if (pageName) {
			updateHash(pageName);
			loadPage(pageName, pagePath);
		}
	});

	// 侧边栏折叠/展开
	$('#navToggle').click(function() {
		$('#sidebar').toggleClass('collapsed');
	});

	// 子菜单展开/收起
	$(document).on('click', '.menu-item.has-sub', function(e) {
		e.preventDefault();
		e.stopPropagation();
		$(this).toggleClass('open');
		$(this).next('.sub-menu').toggleClass('open');
	});

	$(document).on('click', '.sub-menu .menu-item', function(e) {
		e.preventDefault();
		$('.menu-item').removeClass('active');
		$(this).addClass('active');

		const pageName = $(this).data('page');
		const pagePath = $(this).data('path');
		if (pageName) {
			updateHash(pageName);
			loadPage(pageName, pagePath);
		}
	});

	// 模式切换
	$('#themeToggle').click(function() {
		const currentTheme = document.body.getAttribute('data-theme');
		if (currentTheme === 'dark') {
			document.body.removeAttribute('data-theme');
			$(this).removeClass('fa-sun-o').addClass('fa-moon-o');
		} else {
			document.body.setAttribute('data-theme', 'dark');
			$(this).removeClass('fa-moon-o').addClass('fa-sun-o');
		}
	});

	// 用户下拉菜单
	$('#userDropdown').click(function(e) {
		e.stopPropagation();
		$('#userMenu').toggleClass('show');
	});
	$(document).click(function() {
		$('#userMenu').removeClass('show');
	});

	// 退出登录
	$('#btnAdminLogout').click(function() {
		if (!confirm('确定退出后台管理系统？')) return;
		localStorage.removeItem('isAdmin');
		localStorage.removeItem('currentUserName');
		window.location.href = 'login.html';
	});
}

/**
 * 从URL Hash获取当前页面
 */
function getCurrentPageFromHash() {
	const hash = window.location.hash.slice(1);
	return PAGE_MAP[hash] ? hash : null;
}

/**
 * 更新URL Hash（不产生新历史记录）
 */
function updateHash(pageName) {
	history.replaceState({
		page: pageName
	}, '', `#${pageName}`);
}

/**
 * 处理Hash变化事件
 */
function handleHashChange() {
	const pageName = getCurrentPageFromHash() || DEFAULT_PAGE;
	const pagePath = PAGE_MAP[pageName].path;

	// 先更新菜单选中状态
	$('.menu-item').removeClass('active');
	$(`.menu-item[data-page="${pageName}"]`).addClass('active');

	// 再加载页面
	loadPage(pageName, pagePath);
}

/**
 * 加载子页面
 */
function loadPage(pageName, pagePath) {
	// 更新导航路径
	$('.nav-path').html(pagePath);

	// 加载子页面到内容容器
	$('#contentContainer').load(`pages/${pageName}.html`, function(response, status, xhr) {
		if (status === "success") {
			console.log('子页面加载成功：', pageName);
			if (pageName === 'user-management' && window.initUserManagement) {
				window.initUserManagement();
			} else if (pageName === 'operation-log' && window.initOperationLog) {
				window.initOperationLog();
			} else if (pageName === 'recharge-records' && window.initRechargeRecords) {
				window.initRechargeRecords();
			} else if (pageName === 'menu-management' && window.initMenuManagement) {
				window.initMenuManagement();
			} else if (pageName === 'permission-config' && window.initPermissionConfig) {
				window.initPermissionConfig();
			}
		} else {
			$('#contentContainer').html(`
                <div class="page-error" style="text-align:center; padding: 50px; color: #ff4d4f;">
                    <h3><i class="fa fa-exclamation-circle"></i> 页面加载失败</h3>
                    <p>无法加载 ${pageName} 页面，请检查文件是否存在</p>
                </div>
            `);
			console.error(`加载页面失败: ${xhr.status} ${xhr.statusText}`);
		}
	});
}

// 保留通用的JSON读写函数（用于页面数据存储）
function readJsonFile(filePath) {
	return fetch(`${filePath}?_=${new Date().getTime()}`, {
		method: 'GET',
		cache: 'no-cache'
	}).then(res => {
		if (res.ok) return res.json();
		throw new Error(`读取文件失败: ${res.status}`);
	}).catch(err => {
		console.error('读取JSON文件错误:', err);
		return [];
	});
}

/**
 * 保存数据到JSON文件（适配后端接口参数）
 * @param {string} fullFilePath 完整文件路径（如：/data/menus.json）
 * @param {any} data 要保存的数据
 * @returns {Promise} 保存结果Promise
 */
function saveJsonFile(fullFilePath, data) {
    // 1. 拆分完整路径为【目录路径】和【文件名】
    // 示例：/data/menus.json → 目录路径：data，文件名：menus.json
    const pathParts = fullFilePath.trimStart('/').split('/');
    const fileName = pathParts.pop(); // 弹出最后一个元素作为文件名
    const filePath = pathParts.join('/'); // 剩余部分作为目录路径

    // 2. 转换数据为JSON字符串（无需额外编码，后端直接接收）
    const jsonData = JSON.stringify(data, null, 2);

    // 3. 拼接符合后端要求的参数
    const bodyParams = `fileName=${encodeURIComponent(fileName)}&filePath=${encodeURIComponent(filePath)}&data=${encodeURIComponent(jsonData)}`;

    return fetch(`/aspx/SaveJsonFile.aspx`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
        body: bodyParams
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP请求失败：${res.status} ${res.statusText}`);
        // 解析后端JSON响应
        return res.json();
    }).then(result => {
        // 校验后端返回的success状态
        if (!result.success) throw new Error(result.msg || '保存失败');
        return result;
    });
}

window.readJsonFile = readJsonFile;
window.saveJsonFile = saveJsonFile;

/**
 * 通用操作日志记录函数
 */
function recordOperationLog(operationType, operationDesc, status = 'success') {
	let operator = '未登录用户';
	const storedUserName = localStorage.getItem('currentUserName');
	if (storedUserName) {
		operator = storedUserName;
	}
	const logItem = {
		logId: generateUUID(),
		operationType: operationType,
		operationDesc: operationDesc,
		operator: operator,
		status: status,
		operationTime: new Date().toISOString(),
		operationTimeStr: new Date().toLocaleString(),
		ip: '127.0.0.1'
	};

	fetch(`/data/operation-logs.json?_=${new Date().getTime()}`, {
			method: 'GET',
			cache: 'no-cache'
		})
		.then(res => {
			if (res.ok) return res.json();
			return [];
		})
		.then(existingLogs => {
			if (!Array.isArray(existingLogs)) existingLogs = [];
			const newLogs = [logItem, ...existingLogs];
			if (newLogs.length > 1000) {
				newLogs.splice(1000);
			}
			return fetch('/aspx/SaveOperationLogs.aspx', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
				},
				body: `logs=${encodeURIComponent(JSON.stringify(newLogs, null, 2))}`
			});
		})
		.then(res => {
			if (!res.ok) throw new Error('保存日志失败');
			console.log('操作日志记录成功：', logItem);
		})
		.catch(err => {
			console.error('记录操作日志失败：', err);
		});
}

/**
 * 生成UUID
 */
function generateUUID() {
	return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 全局Toast提示函数
 */
function showToast(message, type = 'info') {
	if ($('#toastContainer').length === 0) {
		$('body').append('<div id="toastContainer" class="toast-container"></div>');
	}
	const $container = $('#toastContainer');
	const toastId = 'toast_' + Date.now();
	const toastHtml = `
        <div id="${toastId}" class="toast ${type}">
            <i class="fa ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
	$container.append(toastHtml);
	setTimeout(() => {
		$(`#${toastId}`).fadeOut(300, function() {
			$(this).remove();
		});
	}, 3000);
}

// 挂载全局函数
window.recordOperationLog = recordOperationLog;
window.showToast = showToast;
window.generateUUID = generateUUID;