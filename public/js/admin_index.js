// 定义受保护的超级管理员账户
const PROTECTED_ADMIN_USER = 'admin';

$(document).ready(function() {
	// 验证管理员权限
	const isAdmin = localStorage.getItem('isAdmin');
	if (isAdmin !== 'true') {
		// 这里复用子页面的toast逻辑，或者简单提示
		alert('无管理员权限，请登录！');
		window.location.href = 'login.html';
		return;
	}

	// 初始化页面
	initPage();
});

function initPage() {
	// 1. 初始化加载用户管理页面
	loadPage('user-management', '仪表盘 / 用户管理');

	// 2. 菜单点击事件（所有菜单项）
	$('.menu-item').click(function(e) {
		// 先判断是否是父菜单（有子菜单的项）
		if ($(this).hasClass('has-sub')) {
			// 如果是父菜单，只执行展开/收起逻辑
			$(this).toggleClass('open');
			$(this).next('.sub-menu').toggleClass('open');
			// 阻止事件冒泡，避免触发其他逻辑
			e.stopPropagation();
			return;
		}

		// 如果是子菜单项（可跳转的项），执行页面加载逻辑
		// 移除所有激活状态
		$('.menu-item').removeClass('active');
		// 给当前点击的子菜单项添加激活状态
		$(this).addClass('active');

		// 获取页面信息
		const pageName = $(this).data('page');
		const pagePath = $(this).data('path');

		// 加载对应页面
		if (pageName) {
			loadPage(pageName, pagePath);
		}
	});

	// 侧边栏折叠/展开
	$('#navToggle').click(function() {
		$('#sidebar').toggleClass('collapsed');
	});

	// 替换原来的菜单点击事件
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
 * 加载子页面
 */
function loadPage(pageName, pagePath) {
	// 更新导航路径
	$('.nav-path').html(pagePath);

	// 加载子页面到内容容器
	$('#contentContainer').load(`pages/${pageName}.html`, function(response, status, xhr) {
		if (status === "success") {
			console.log('子页面加载成功：', pageName);
			// 根据页面名称调用对应的初始化函数
			if (pageName === 'user-management' && window.initUserManagement) {
				window.initUserManagement();
			} else if (pageName === 'operation-log' && window.initOperationLog) {
				window.initOperationLog();
			}
		} else {
			$('#contentContainer').html(`
                <div class="page-error">
                    <h3>页面加载失败</h3>
                    <p>无法加载 ${pageName} 页面，请检查文件是否存在</p>
                </div>
            `);
			console.error(`加载页面失败: ${xhr.status} ${xhr.statusText}`);
		}
	});
}

/**
 * 通用操作日志记录函数
 * @param {String} operationType 操作类型（新增用户/编辑用户/删除用户/登录/退出等）
 * @param {String} operationDesc 操作描述（详细信息）
 * @param {String} operator 操作人（默认admin）
 * @param {String} status 操作状态（success/fail）
 */
function recordOperationLog(operationType, operationDesc, operator = 'admin', status = 'success') {
	// 1. 构造日志对象
	const logItem = {
		logId: generateUUID(), // 唯一ID
		operationType: operationType,
		operationDesc: operationDesc,
		operator: operator,
		status: status,
		operationTime: new Date().toISOString(), // 精确到毫秒的时间戳
		operationTimeStr: new Date().toLocaleString(), // 本地时间字符串
		ip: '127.0.0.1' // 本地测试用，实际可获取客户端IP
	};

	// 2. 读取现有日志
	fetch(`/data/operation-logs.json?_=${new Date().getTime()}`, {
			method: 'GET',
			cache: 'no-cache'
		})
		.then(res => {
			if (res.ok) return res.json();
			return []; // 文件不存在则返回空数组
		})
		.then(existingLogs => {
			if (!Array.isArray(existingLogs)) existingLogs = [];

			// 3. 添加新日志（最新的在最前面）
			const newLogs = [logItem, ...existingLogs];

			// 可选：限制日志数量（保留最近1000条）
			if (newLogs.length > 1000) {
				newLogs.splice(1000);
			}

			// 4. 保存日志到本地文件
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
			// 失败不影响主流程，仅打印日志
		});
}

/**
 * 生成UUID（用于日志唯一标识）
 */
function generateUUID() {
	return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 将日志函数挂载到window，供子页面调用
window.recordOperationLog = recordOperationLog;