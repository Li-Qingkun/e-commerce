// 定义受保护的超级管理员账户（不可删除/不可修改身份）
const PROTECTED_ADMIN_USER = 'admin';

$(document).ready(function() {
	// 验证管理员权限
	const isAdmin = localStorage.getItem('isAdmin');
	if (isAdmin !== 'true') {
		showToast('无管理员权限，请登录！', 'error');
		window.location.href = 'login.html';
		return;
	}

	// 初始化页面
	initPage();
});

/**
 * 显示 Toast 提示
 * @param {string} message - 提示内容
 * @param {string} type - 提示类型：success | error | info
 * @param {number} duration - 显示时长（毫秒），默认3000ms
 */
function showToast(message, type = 'info', duration = 3000) {
	const $container = $('#toastContainer');

	// 创建 Toast 元素
	const $toast = $(`
                <div class="toast ${type}">
                    ${message}
                </div>
            `);

	// 添加到容器中
	$container.append($toast);

	// 自动移除
	setTimeout(() => {
		$toast.remove();
	}, duration);
}

/**
 * 校验密码表单（移除密码长度限制）
 */
function validatePasswordForm() {
	const isEdit = !!$('#editUserName').val().trim();
	const password = $('#modalPassword').val().trim();
	const confirmPwd = $('#modalConfirmPwd').val().trim();
	const $tip = $('#passwordTip');
	const $pwdInput = $('#modalConfirmPwd');
	const $saveBtn = $('#btnModalSave');

	// 编辑模式：密码可选（为空则不修改）
	if (isEdit && !password && !confirmPwd) {
		$tip.removeClass('show');
		$pwdInput.removeClass('error');
		return true;
	}

	// 新增模式：密码可选（取消必填限制）
	let isValid = true;

	// 仅校验密码一致性（如果输入了密码）
	if (password || confirmPwd) {
		if (password !== confirmPwd) {
			$tip.addClass('show');
			$pwdInput.addClass('error');
			isValid = false;
		} else {
			$tip.removeClass('show');
			$pwdInput.removeClass('error');
		}
	} else {
		$tip.removeClass('show');
		$pwdInput.removeClass('error');
	}

	// 用户名重复校验
	const userNameExist = $('#userNameTip').hasClass('show');
	if (userNameExist) {
		isValid = false;
	}

	// 启用/禁用保存按钮
	$saveBtn.prop('disabled', !isValid);
	return isValid;
}

function initPage() {
	// 侧边栏折叠/展开
	$('#navToggle').click(function() {
		$('#sidebar').toggleClass('collapsed');
	});

	// 子菜单展开/收起
	$('.menu-item.has-sub').click(function() {
		$(this).toggleClass('open');
		$(this).next('.sub-menu').toggleClass('open');
	});

	// 模式切换（日间/夜间）
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

	// 加载用户数据
	loadAllUsers();

	// 新增用户按钮（默认选中普通用户）
	$('#btnAddUser').click(function() {
		$('#modalTitle').text('新增用户');
		$('#editUserName').val('');
		$('#modalUserName').val('').removeAttr('disabled').removeClass('error');
		$('#modalPassword').val('');
		$('#modalConfirmPwd').val('');
		$('#modalRole').val('normal'); // 默认普通用户
		$('#modalShopList').val('').removeAttr('disabled');
		$('#userNameTip').removeClass('show');
		$('#passwordTip').removeClass('show');
		$('#btnModalSave').prop('disabled', false).css('opacity', '1');
		$('#userModal').addClass('show');
		setTimeout(() => $('#modalUserName').focus(), 100);
	});

	// 实时校验用户名
	let userNameCheckTimer = null;
	$('#modalUserName').on('input blur', function() {
		const $this = $(this);
		const userName = $this.val().trim();
		const $tip = $('#userNameTip');
		const $saveBtn = $('#btnModalSave');

		if (!userName) {
			$tip.removeClass('show');
			$this.removeClass('error');
			clearTimeout(userNameCheckTimer);
			validatePasswordForm();
			return;
		}

		clearTimeout(userNameCheckTimer);
		userNameCheckTimer = setTimeout(() => {
			fetch(`/data/userdata.json?_=${new Date().getTime()}`, {
					cache: 'no-cache'
				})
				.then(res => res.ok ? res.json() : [])
				.then(data => {
					if (!Array.isArray(data)) data = [];
					const editUserName = $('#editUserName').val().trim();
					const isExist = data.some(u =>
						u.userName && u.userName.trim() === userName && u.userName !==
						editUserName
					);

					if (isExist) {
						$tip.addClass('show');
						$this.addClass('error');
						$saveBtn.prop('disabled', true).css('opacity', '0.6');
					} else {
						$tip.removeClass('show');
						$this.removeClass('error');
						validatePasswordForm();
					}
				})
				.catch(err => {
					console.error('实时校验用户名失败：', err);
					$tip.removeClass('show');
					validatePasswordForm();
				});
		}, 500);
	});

	// 实时校验密码一致性（仅校验一致性，移除长度限制）
	$('#modalPassword, #modalConfirmPwd').on('input', validatePasswordForm);

	// 关闭弹窗
	$('#modalClose, #btnModalCancel').click(function() {
		$('#userModal').removeClass('show');
		setTimeout(() => {
			$('#modalTitle').text('新增用户');
			$('#editUserName').val('');
			$('#modalUserName').val('').removeAttr('disabled').removeClass('error');
			$('#modalPassword').val('');
			$('#modalConfirmPwd').val('');
			$('#modalRole').val('normal');
			$('#modalShopList').val('').removeAttr('disabled');
			$('#userNameTip').removeClass('show');
			$('#passwordTip').removeClass('show');
			$('#btnModalSave').prop('disabled', false).css('opacity', '1');
		}, 300);
	});

	// 点击弹窗外部关闭
	$('#userModal').click(function(e) {
		if (e.target === this) {
			$('#userModal').removeClass('show');
		}
	});

	// 阻止弹窗内容区事件冒泡
	$('.modal-content').click(function(e) {
		e.stopPropagation();
	});

	// 保存用户
	$('#btnModalSave').click(function() {
		saveUser();
	});

	// 编辑用户事件（修复：直接使用 .data() 获取的对象数组）
	$('#userTableBody').on('click', '.btn-edit-user', function() {
		try {
			const userName = $(this).data('username');
			const password = $(this).data('password') || '';
			const role = $(this).data('role') || 'normal';
			const shopList = $(this).data('shoplist') || []; // 直接获取数组，无需解析
			const shopNames = shopList.map(shop => shop.shopName || '').join(',');

			// 保护逻辑：如果是admin账户，禁用身份修改
			if (userName === PROTECTED_ADMIN_USER) {
				$('#modalRole').val('admin').prop('disabled', true);
				showToast('超级管理员账户身份禁止修改！', 'info');
			} else {
				$('#modalRole').val(role).prop('disabled', false);
			}

			$('#modalTitle').text('编辑用户');
			$('#editUserName').val(userName);
			$('#modalUserName').val(userName).attr('disabled', true).removeClass('error');
			$('#modalPassword').val(password);
			$('#modalConfirmPwd').val(password);
			$('#modalShopList').val(shopNames).removeAttr('disabled');
			$('#userNameTip').removeClass('show');
			$('#passwordTip').removeClass('show');
			$('#btnModalSave').prop('disabled', false).css('opacity', '1');
			$('#userModal').addClass('show');
			setTimeout(() => $('#modalPassword').focus(), 100);
		} catch (e) {
			console.error('编辑弹窗加载失败：', e);
			showToast('加载编辑数据失败，请重试！', 'error');
		}
	});

	// 删除用户事件
	$('#userTableBody').on('click', '.btn-delete-user', function() {
		const userName = $(this).data('username');
		deleteUser(userName);
	});
}

/**
 * 加载所有用户数据（新增身份字段展示，添加admin账户UI保护）
 */
function loadAllUsers() {
	const $tbody = $('#userTableBody');
	$tbody.empty().append('<tr><td colspan="8" class="empty-tip">加载中...</td></tr>');

	const timestamp = new Date().getTime();
	fetch(`/data/userdata.json?_=${timestamp}`, {
			method: 'GET',
			cache: 'no-cache',
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		})
		.then(response => {
			if (response.ok) {
				return response.json();
			} else if (response.status === 404) {
				$tbody.empty().append('<tr><td colspan="8" class="empty-tip">暂无用户数据</td></tr>');
				return [];
			}
			throw new Error(`获取用户数据失败 [${response.status}]`);
		})
		.then(userData => {
			$tbody.empty();
			if (!Array.isArray(userData) || userData.length === 0) {
				if ($tbody.find('tr').length === 0) {
					$tbody.append('<tr><td colspan="8" class="empty-tip">暂无用户数据</td></tr>');
				}
				return;
			}

			userData.forEach((user, index) => {
				const createTime = user.createTime ? new Date(user.createTime).toLocaleString() : '未知';
				const updateTime = user.updateTime ? new Date(user.updateTime).toLocaleString() : '未知';
				const showPwd = user.password ? user.password.substring(0, 3) + '****' : '未设置';
				// 处理身份字段
				const userRole = user.role || 'normal';
				const roleText = userRole === 'admin' ? '管理员' : '普通用户';
				const roleClass = userRole === 'admin' ? 'admin' : 'normal';

				// 判断是否为受保护的admin账户
				const isProtected = user.userName === PROTECTED_ADMIN_USER;

				let shopHtml = '';
				if (user.shopList && user.shopList.length > 0) {
					user.shopList.forEach(shop => {
						shopHtml += `<span class="shop-list-tag">${shop.shopName || '-'}</span>`;
					});
				} else {
					shopHtml = '-';
				}

				// 1. 先创建整行 HTML
				const $tr = $(`
                            <tr data-username="${user.userName}">
                                <td>${index + 1}</td>
                                <td>${user.userName || '-'}</td>
                                <td>${showPwd}</td>
                                <td><span class="role-tag ${roleClass}">${roleText}</span></td>
                                <td>${shopHtml}</td>
                                <td>${createTime}</td>
                                <td>${updateTime}</td>
                                <td></td>
                            </tr>
                        `);

				// 2. 单独创建编辑按钮，使用 jQuery .data() 方法直接存储对象
				const $editBtn = $(
					`<button class="btn btn-sm btn-primary btn-edit-user ${isProtected ? 'disabled' : ''}" 
								        ${isProtected ? 'title="超级管理员账户部分操作受限"' : ''}>
									<i class="fa fa-edit"></i> 编辑
								</button>`
				);
				$editBtn.data('username', user.userName);
				$editBtn.data('password', user.password || '');
				$editBtn.data('role', userRole); // 存储身份信息
				$editBtn.data('shoplist', user.shopList || []); // 直接存储数组对象

				// 3. 创建删除按钮（admin账户禁用）
				const $deleteBtn = $(
					`<button class="btn btn-sm btn-danger btn-delete-user ${isProtected ? 'disabled' : ''}" 
								        ${isProtected ? 'title="超级管理员账户禁止删除"' : ''}>
									<i class="fa fa-trash"></i> 删除
								</button>`
				);
				$deleteBtn.data('username', user.userName);

				// 4. 将按钮追加到操作列
				$tr.find('td:last-child').append($editBtn).append(' ').append($deleteBtn);
				$tbody.append($tr);
			});
		})
		.catch(err => {
			console.error('加载用户数据失败：', err);
			$tbody.empty().append('<tr><td colspan="8" class="empty-tip">加载用户数据失败</td></tr>');
		});
}

/**
 * 保存用户（新增/编辑）- 移除密码长度限制，新增admin身份保护
 */
function saveUser() {
	const editUserName = $('#editUserName').val().trim();
	const userName = $('#modalUserName').val().trim();
	const password = $('#modalPassword').val().trim();
	const confirmPwd = $('#modalConfirmPwd').val().trim();
	const userRole = $('#modalRole').val() || 'normal'; // 获取身份
	const shopInput = $('#modalShopList').val().trim();

	// 保护逻辑：禁止修改admin账户的身份
	if (editUserName === PROTECTED_ADMIN_USER && userRole !== 'admin') {
		showToast('超级管理员账户身份禁止修改！', 'error');
		return;
	}

	// 1. 基础校验
	if (!userName) {
		showToast('请输入用户名！', 'error');
		return;
	}

	// 仅校验密码一致性（如果输入了密码），移除长度限制
	if (password || confirmPwd) {
		if (password !== confirmPwd) {
			showToast('两次密码输入不一致！', 'error');
			return;
		}
	}

	if (!shopInput) {
		showToast('请输入店铺名称！', 'error');
		return;
	}

	// 2. 处理店铺列表数据
	const shopList = shopInput.split(',')
		.map(shop => shop.trim())
		.filter(shop => shop)
		.map(shop => ({
			shopName: shop
		}));
	const now = new Date().toISOString();

	// 3. 先请求服务器最新数据
	const timestamp = new Date().getTime();
	fetch(`/data/userdata.json?_=${timestamp}`, {
			method: 'GET',
			cache: 'no-cache',
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		})
		.then(response => {
			if (response.ok) return response.json();
			if (response.status === 404) return [];
			throw new Error(`获取最新用户数据失败 [${response.status}]`);
		})
		.then(latestUserData => {
			if (!Array.isArray(latestUserData)) latestUserData = [];
			let newUserData = [...latestUserData];

			// 4. 新增用户
			if (!editUserName) {
				const isUserNameExist = latestUserData.some(user =>
					user.userName && user.userName.trim() === userName
				);
				if (isUserNameExist) {
					showToast(`用户名【${userName}】已存在！`, 'error');
					throw new Error(`用户名重复：${userName}`);
				}
				// 新增用户（包含身份字段，默认普通用户）
				newUserData.push({
					userName: userName,
					password: password, // 不再限制长度
					role: userRole,
					shopList: shopList,
					createTime: now,
					updateTime: now
				});
			} else {
				// 编辑用户：密码为空则保留原密码，admin账户强制保留admin身份
				newUserData = newUserData.map(user => {
					if (user.userName === editUserName) {
						return {
							...user,
							shopList: shopList,
							password: password || user.password,
							role: editUserName === PROTECTED_ADMIN_USER ? 'admin' : userRole, // 强制保护admin身份
							updateTime: now
						};
					}
					return user;
				});
			}

			// 5. 提交到后端保存
			return fetch('/aspx/SaveUserData.aspx', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
				},
				body: `data=${encodeURIComponent(JSON.stringify(newUserData, null, 2))}`
			});
		})
		.then(response => {
			if (!response.ok) throw new Error(`保存请求失败 [${response.status}]`);
			return response.text();
		})
		.then(text => {
			let res = {
				success: false
			};
			try {
				res = JSON.parse(text);
			} catch (e) {
				res.success = text.includes('success') || text.includes('成功');
			}

			if (!res.success) throw new Error(res.msg || '保存失败');

			showToast(editUserName ? '用户编辑成功！' : '用户新增成功！', 'success');
			$('#userModal').removeClass('show');
			setTimeout(loadAllUsers, 300);
		})
		.catch(err => {
			console.error('保存用户失败：', err);
			showToast(err.message || '保存用户失败，请重试！', 'error');
		});
}

/**
 * 删除用户（添加admin账户保护）
 */
function deleteUser(userName) {
	// 核心保护逻辑：禁止删除admin账户
	if (userName === PROTECTED_ADMIN_USER) {
		showToast(`超级管理员账户【${PROTECTED_ADMIN_USER}】禁止删除！`, 'error');
		return;
	}

	if (!confirm(`确定删除用户【${userName}】吗？`)) return;

	$(`.btn-delete-user[data-username="${userName}"]`).prop("disabled", true).text("删除中...");

	fetch("/data/userdata.json?t=" + new Date().getTime(), {
			cache: "no-cache"
		})
		.then(res => {
			if (!res.ok) throw new Error("读取数据失败");
			return res.json();
		})
		.then(list => {
			var newList = list.filter(u => u.userName != userName);

			return fetch("/aspx/SaveUserData.aspx", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				body: "data=" + encodeURIComponent(JSON.stringify(newList, null, 2))
			});
		})
		.then(res => {
			if (!res.ok) throw new Error("提交删除请求失败");
			return res.json();
		})
		.then(result => {
			if (!result.success) throw new Error(result.msg || "删除失败");

			$(`tr[data-username="${userName}"]`).fadeOut(300, function() {
				$(this).remove();
				loadAllUsers();
			});
			showToast("用户删除成功！", 'success');
		})
		.catch(err => {
			$(`.btn-delete-user[data-username="${userName}"]`).prop("disabled", false).html(
				'<i class="fa fa-trash"></i> 删除');
			showToast("删除失败：" + err.message, 'error');
			console.error("删除失败：", err);
		});
}