$(document).ready(function() {
	// 初始化页面
	initLoginPage();
});

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'info', duration = 3000) {
	const $container = $('#toastContainer');
	const $toast = $(`<div class="toast ${type}">${message}</div>`);

	$container.append($toast);

	setTimeout(() => {
		$toast.remove();
	}, duration);
}

/**
 * 初始化登录页面
 */
function initLoginPage() {
	// 登录按钮点击事件
	$('#btnLogin').click(handleLogin);

	// 注册按钮点击事件
	$('#btnRegister').click(handleRegister);

	// 密码框回车触发登录
	$('#password').on('keydown', function(e) {
		if (e.key === 'Enter' || e.keyCode === 13) {
			handleLogin();
		}
	});

	// 注册页面密码框回车触发注册
	$('#regConfirmPwd').on('keydown', function(e) {
		if (e.key === 'Enter' || e.keyCode === 13) {
			handleRegister();
		}
	});

	// 实时校验登录表单
	$('#username, #password').on('input', function() {
		validateLoginForm();
	});

	// 实时校验注册表单
	$('#regUsername, #regPassword, #regConfirmPwd, #regShopList').on('input', function() {
		validateRegisterForm();
	});

	// 检查是否已登录
	checkLoginStatus();
}

/**
 * 切换到登录表单
 */
function switchToLogin() {
	$('#registerForm').hide();
	$('#loginForm').show();
	$('#formTitle').text('用户登录');
	// 清空错误提示
	$('.error-tip').removeClass('show');
	$('.form-control').removeClass('error');
}

/**
 * 切换到注册表单
 */
function switchToRegister() {
	$('#loginForm').hide();
	$('#registerForm').show();
	$('#formTitle').text('用户注册');
	// 清空错误提示
	$('.error-tip').removeClass('show');
	$('.form-control').removeClass('error');
}

/**
 * 校验登录表单（取消密码长度限制）
 */
function validateLoginForm() {
	const username = $('#username').val().trim();
	const password = $('#password').val().trim();
	let isValid = true;

	// 用户名校验
	if (!username) {
		$('#usernameTip').addClass('show');
		$('#username').addClass('error');
		isValid = false;
	} else {
		$('#usernameTip').removeClass('show');
		$('#username').removeClass('error');
	}

	// 密码校验（仅非空，取消长度限制）
	if (!password) {
		$('#passwordTip').addClass('show');
		$('#password').addClass('error');
		isValid = false;
	} else {
		$('#passwordTip').removeClass('show');
		$('#password').removeClass('error');
	}

	// 启用/禁用登录按钮
	$('#btnLogin').prop('disabled', !isValid);
	return isValid;
}

/**
 * 校验注册表单（取消密码长度限制）
 */
function validateRegisterForm() {
	const username = $('#regUsername').val().trim();
	const password = $('#regPassword').val().trim();
	const confirmPwd = $('#regConfirmPwd').val().trim();
	const shopList = $('#regShopList').val().trim();
	let isValid = true;

	// 用户名校验
	if (!username) {
		$('#regUsernameTip').addClass('show');
		$('#regUsername').addClass('error');
		isValid = false;
	} else {
		$('#regUsernameTip').removeClass('show');
		$('#regUsername').removeClass('error');
	}

	// 密码校验（仅非空，取消长度限制）
	if (!password) {
		$('#regPasswordTip').addClass('show');
		$('#regPassword').addClass('error');
		isValid = false;
	} else {
		$('#regPasswordTip').removeClass('show');
		$('#regPassword').removeClass('error');
	}

	// 确认密码校验（仅一致性，取消长度限制）
	if (password && confirmPwd && password !== confirmPwd) {
		$('#regConfirmPwdTip').addClass('show');
		$('#regConfirmPwd').addClass('error');
		isValid = false;
	} else {
		$('#regConfirmPwdTip').removeClass('show');
		$('#regConfirmPwd').removeClass('error');
	}

	// 店铺列表校验
	if (!shopList) {
		$('#regShopListTip').addClass('show');
		$('#regShopList').addClass('error');
		isValid = false;
	} else {
		$('#regShopListTip').removeClass('show');
		$('#regShopList').removeClass('error');
	}

	// 启用/禁用注册按钮
	$('#btnRegister').prop('disabled', !isValid);
	return isValid;
}

/**
 * 辅助函数：判断日期是否过期
 * @param {string} expireTime - ISO格式的过期时间字符串
 * @returns {boolean} - 是否过期
 */
function isDateExpired(expireTime) {
	if (!expireTime) return true; // 无过期时间默认视为过期
	const expireDate = new Date(expireTime);
	const now = new Date();
	// 比较时间戳，当前时间大于过期时间则视为过期
	return now.getTime() > expireDate.getTime();
}

/**
 * 处理登录逻辑（按身份跳转不同页面）
 */
function handleLogin() {
	if (!validateLoginForm()) {
		return;
	}

	const username = $('#username').val().trim();
	const password = $('#password').val().trim();

	$('#btnLogin').prop('disabled', true).text('登录中...');

	// 请求用户数据
	fetch(`/data/userdata.json?_=${new Date().getTime()}`, {
			cache: 'no-cache'
		})
		.then(response => {
			if (response.ok) return response.json();
			throw new Error('获取用户数据失败');
		})
		.then(userData => {
			if (!Array.isArray(userData)) {
				throw new Error('用户数据格式错误');
			}

			// 查找用户
			const user = userData.find(u =>
				u.userName === username && u.password === password
			);

			if (!user) {
				throw new Error('用户名或密码错误');
			}

			// ********** 新增逻辑：判断会员是否过期 **********
			let userRole = user.role || 'normal';
			// 检查会员到期时间是否过期
			const isMemberExpired = isDateExpired(user.memberExpireTime);

			// 如果过期，强制将角色改为normal
			if (isMemberExpired && userRole !== 'admin') {
				userRole = 'normal';
				// 提示用户会员已过期
				// showToast('您的会员已过期，当前仅能以普通用户身份登录', 'warning');
			}

			// ********** 新增逻辑：存储完整用户信息到localStorage **********
			// 深拷贝用户对象，避免修改原数据
			const userInfo = JSON.parse(JSON.stringify(user));
			// 更新用户信息中的角色（如果过期则改为normal）
			userInfo.role = userRole;
			// 存储完整用户信息
			localStorage.setItem('currentUserInfo', JSON.stringify(userInfo));

			// 验证成功，存储用户信息
			localStorage.setItem('currentUserName', username);
			localStorage.setItem('isAdmin', userRole === 'admin' ? 'true' : 'false');

			showToast('登录成功！', 'success');

			// 按身份跳转不同页面
			setTimeout(() => {
				if (userRole === 'admin') {
					window.location.href = 'admin_index.html';
				} else {
					window.location.href = 'index.html';
				}
			}, 1000);
		})
		.catch(err => {
			showToast(err.message, 'error');
			$('#btnLogin').prop('disabled', false).text('登录');
			console.error('登录失败：', err);
		});
}

/**
 * 辅助函数：保存JSON文件（和admin_index.js保持一致）
 */
function saveJsonFile(fullFilePath, data) {
	// 拆分完整路径为【目录路径】和【文件名】
	const pathParts = fullFilePath.trimStart('/').split('/');
	const fileName = pathParts.pop();
	const filePath = pathParts.join('/');

	// 转换数据为JSON字符串
	const jsonData = JSON.stringify(data, null, 2);

	// 拼接参数
	const bodyParams =
		`fileName=${encodeURIComponent(fileName)}&filePath=${encodeURIComponent(filePath)}&data=${encodeURIComponent(jsonData)}`;

	return fetch(`/aspx/SaveJsonFile.aspx`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
		},
		body: bodyParams
	}).then(res => {
		if (!res.ok) throw new Error(`HTTP请求失败：${res.status} ${res.statusText}`);
		return res.json();
	}).then(result => {
		if (!result.success) throw new Error(result.msg || '保存失败');
		return result;
	});
}

/**
 * 为新注册用户分配非VIP菜单权限
 */
function assignMenuPermissionForNewUser(newUserId, newUserName) {
	// 1. 加载菜单数据和现有权限数据
	Promise.all([
		fetch(`/data/menus.json?_=${new Date().getTime()}`, {
			cache: 'no-cache'
		}).then(res => res.ok ? res.json() : []),
		fetch(`/data/user_menu_permissions.json?_=${new Date().getTime()}`, {
			cache: 'no-cache'
		}).then(res => res.ok ? res.json() : [])
	]).then(([menus, userPermissions]) => {
		// 2. 筛选所有非VIP菜单ID
		const nonVipMenuIds = menus.filter(menu => !menu.isVip && menu.status === 'enable').map(menu => menu
			.id);

		if (nonVipMenuIds.length === 0) {
			// showToast('暂无非VIP菜单可分配', 'info');
			return;
		}

		// 3. 构建新用户权限记录
		const newPermission = {
			userId: newUserId,
			userName: newUserName,
			menuIds: nonVipMenuIds,
			createTime: new Date().toISOString(),
			updateTime: new Date().toISOString()
		};

		// 4. 添加到权限列表
		userPermissions.push(newPermission);

		// 5. 保存权限数据
		return saveJsonFile('/data/user_menu_permissions.json', userPermissions);
	}).then(() => {
		// showToast('已为新用户分配所有非VIP菜单权限', 'success');
	}).catch(err => {
		// showToast(`权限分配失败：${err.message}`, 'error');
		console.error('分配菜单权限失败：', err);
	});
}

/**
 * 处理注册逻辑（默认普通用户身份 + 自动分配菜单权限）
 */
function handleRegister() {
	if (!validateRegisterForm()) {
		return;
	}

	const username = $('#regUsername').val().trim();
	const password = $('#regPassword').val().trim();
	const shopListInput = $('#regShopList').val().trim();
	const userRole = $('#regRole').val() || 'normal'; // 默认普通用户

	$('#btnRegister').prop('disabled', true).text('注册中...');

	// 处理店铺列表
	const shopList = shopListInput
		// 替换所有常见分隔符为英文逗号：中文逗号、顿号、多个空格
		.replace(/，|、|\s+/g, ',')
		.split(',')
		.map(shop => shop.trim())
		.filter(shop => shop)
		.map(shop => ({
			shopName: shop
		}));

	// 先获取现有用户数据
	fetch(`/data/userdata.json?_=${new Date().getTime()}`, {
			cache: 'no-cache'
		})
		.then(response => {
			if (response.ok) return response.json();
			if (response.status === 404) return [];
			throw new Error('获取用户数据失败');
		})
		.then(existingUsers => {
			if (!Array.isArray(existingUsers)) existingUsers = [];

			// 检查用户名是否已存在
			const isExist = existingUsers.some(u => u.userName === username);
			if (isExist) {
				throw new Error('用户名已存在，请更换用户名');
			}

			// 构建新用户数据
			const newUser = {
				id: generateSecureUUID(),
				userName: username,
				password: password, // 不限制长度
				role: userRole, // 默认普通用户
				memberExpireTime: "",
				shopList: shopList,
				createTime: new Date().toISOString(),
				updateTime: new Date().toISOString()
			};

			const newUserData = [...existingUsers, newUser];

			// 保存用户数据
			return fetch('/aspx/SaveUserData.aspx', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
				},
				body: `data=${encodeURIComponent(JSON.stringify(newUserData, null, 2))}`
			}).then(response => {
				if (!response.ok) throw new Error('注册请求失败');
				return response.text();
			}).then(result => {
				let success = false;
				try {
					const res = JSON.parse(result);
					success = res.success;
				} catch (e) {
					success = result.includes('success') || result.includes('成功');
				}

				if (!success) throw new Error('注册失败，请重试');

				// 核心新增逻辑：注册成功后为新用户分配非VIP菜单权限
				assignMenuPermissionForNewUser(newUser.id, newUser.userName);

				showToast('注册成功！即将跳转到登录页面', 'success');
				setTimeout(() => {
					switchToLogin();
					$('#username').val(username);
					$('#password').focus();
				}, 1500);
			});
		})
		.catch(err => {
			showToast(err.message, 'error');
			$('#btnRegister').prop('disabled', false).text('注册');
			console.error('注册失败：', err);
		});
}

/**
 * 检查登录状态，防止重复登录
 */
function checkLoginStatus() {
	const currentUser = localStorage.getItem('currentUserName');
	if (currentUser) {
		const isAdmin = localStorage.getItem('isAdmin') === 'true';
		const targetPage = isAdmin ? 'admin_index.html' : 'index.html';

		// 如果不在目标页面，自动跳转
		if (window.location.pathname.indexOf(targetPage) === -1) {
			window.location.href = targetPage;
		}
	}
}

/**
 * 生成兼容所有环境的安全 UUID（替换原有函数，解决兼容性问题）
 */
function generateSecureUUID() {
	// 直接使用时间戳+随机数生成唯一ID，兼容所有浏览器和本地环境
	const timestamp = Date.now().toString(36);
	const randomStr = Math.random().toString(36).substr(2, 15);
	const suffix = Math.random().toString(36).substr(2, 15);
	// 拼接成类似 UUID 的唯一标识，确保用户ID不重复
	return `user_${timestamp}_${randomStr}_${suffix}`;
}