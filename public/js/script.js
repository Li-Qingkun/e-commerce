// ===================== 全局配置 =====================
const CONFIG = {
	dateCellWidth: 80, // 时间轴单元格宽度
	planHeight: 40, // 计划块高度
	planMargin: 5, // 计划块间距
	jsonFilePath: '/data/ss-data/', // JSON文件存储目录（需提前创建）
	// 新增拖动相关配置
	dragThreshold: 5, // 拖动触发阈值（像素）
	snapOffset: 0 // 吸附偏移量
};

// ===================== 全局变量 =====================
let orderPlans = []; // 订单计划数据
let currentUserName = ''; // 当前登录用户名
let currentShopName = ''; // 当前选中店铺名称
let userShopList = []; // 当前用户的店铺列表
// 用户信息JSON（初始为空，确保每次都从文件加载）
let USER_INFO_LIST = [];
// 当前用户完整信息（新增）
let currentUserInfo = null;
// 充值记录数据（新增）
let rechargeRecords = [];
// 全局变量 - 存储当前右键点击的计划数据
let currentClickPlan = null;

// ===================== 新增：右键菜单初始化函数 =====================
/**
 * 初始化计划块右键菜单
 * 优化点：
 * 1. 修复晒图状态字段不存在时赋值失败的问题
 * 2. 增强代码健壮性（空值检查、类型处理）
 * 3. 优化事件绑定和解绑逻辑，避免内存泄漏
 * 4. 提取通用函数，提升可维护性
 * 5. 增强用户体验（加载提示、状态校验）
 */
function initPlanContextMenu() {
	// 缓存DOM元素，减少重复查询
	const $contextMenu = $('#planContextMenu');
	const $planItems = $('.timeline-plan-item');
	const $togglePostPictureItem = $('#togglePostPictureItem');

	// ========== 提取通用工具函数 ==========
	/**
	 * 获取格式化的晒图状态（处理字段不存在的情况）
	 * @param {Object} plan - 计划对象
	 * @returns {number} 标准化的晒图状态值（0/1）
	 */
	const getNormalizedPostPictureStatus = (plan) => {
		// 处理字段不存在、非数字、非0/1的情况，统一初始化为0
		const status = Number(plan.PostPictures);
		return isNaN(status) || ![0, 1].includes(status) ? 0 : status;
	};

	/**
	 * 更新晒图状态菜单文本
	 * @param {Object} plan - 计划对象
	 */
	const updatePostPictureMenuText = (plan) => {
		const postPictures = getNormalizedPostPictureStatus(plan);
		const menuText = postPictures === 1 ? '未晒图' : '已晒图';
		$togglePostPictureItem.text(menuText);
	};

	/**
	 * 关闭右键菜单并重置激活状态
	 */
	const closeContextMenu = () => {
		$contextMenu.hide();
		$planItems.removeClass('contextmenu-active');
	};

	// ========== 核心事件绑定 ==========
	// 为所有计划块绑定右键事件（优化命名空间，避免冲突）
	$planItems.off('contextmenu.planContextMenu').on('contextmenu.planContextMenu', function(e) {
		// 阻止默认行为和事件冒泡
		e.preventDefault();
		e.stopPropagation();

		// 安全获取计划ID（空值校验）
		const planId = $(this).data('plan-id');
		if (!planId) {
			console.warn('计划ID不存在，无法打开右键菜单');
			return;
		}

		// 查找当前计划（严格类型匹配+空值校验）
		currentClickPlan = orderPlans.find(plan => String(plan.ID) === String(planId));
		if (!currentClickPlan) {
			console.warn(`未找到ID为${planId}的计划`);
			return;
		}

		// 标记当前激活的计划块
		$planItems.removeClass('contextmenu-active');
		$(this).addClass('contextmenu-active');

		// 更新晒图状态菜单文本（兼容字段不存在的情况）
		updatePostPictureMenuText(currentClickPlan);

		// 定位并显示右键菜单（增加边界检测，避免菜单超出视口）
		const menuWidth = $contextMenu.outerWidth();
		const menuHeight = $contextMenu.outerHeight();
		const viewportWidth = $(window).width();
		const viewportHeight = $(window).height();

		let left = e.clientX;
		let top = e.clientY;

		// 右边界检测
		if (left + menuWidth > viewportWidth) {
			left = viewportWidth - menuWidth - 10;
		}
		// 下边界检测
		if (top + menuHeight > viewportHeight) {
			top = viewportHeight - menuHeight - 10;
		}

		$contextMenu.css({
			left: `${left}px`,
			top: `${top}px`,
			display: 'block'
		});
	});

	// 点击页面其他区域关闭右键菜单（优化命名空间）
	$(document).off('click.planContextMenu').on('click.planContextMenu', function(e) {
		// 排除点击菜单本身的情况
		if (!$(e.target).closest($contextMenu).length) {
			closeContextMenu();
		}
	});

	// 复制计划功能实现（增强健壮性）
	$('#copyPlanItem').off('click.planContextMenu').on('click.planContextMenu', async function() {
		if (!currentClickPlan) {
			showToast('未选中任何计划', 'warning');
			return;
		}

		try {
			showToast('正在复制计划...', 'loading'); // 加载提示

			// 深拷贝原计划数据（处理循环引用容错）
			const newPlan = structuredClone(currentClickPlan); // 替代JSON.parse(JSON.stringify)，更健壮

			// 更新需要修改的字段（增强ID唯一性）
			newPlan.ID = `plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
			newPlan.createTime = new Date();
			newPlan.Name = `${newPlan.Name || '未命名计划'}_副本`; // 兼容无名称的情况

			// 标准化晒图状态（核心：处理字段不存在）
			newPlan.PostPictures = getNormalizedPostPictureStatus(currentClickPlan);

			// 修复ReleaseDate类型（增加空值校验）
			if (Array.isArray(newPlan.ReleasePlans)) {
				newPlan.ReleasePlans = newPlan.ReleasePlans.map(detail => {
					if (!detail) return {};
					return {
						...detail,
						ReleaseDate: detail.ReleaseDate ? new Date(detail.ReleaseDate) : new Date()
					};
				});
			} else {
				newPlan.ReleasePlans = []; // 初始化空数组，避免后续报错
			}

			// 添加新计划到数据源
			orderPlans.push(newPlan);

			// 刷新视图
			refreshTimeline();
			refreshOrderPlanTable();

			// 保存到文件
			await saveDataToJsonFile();

			// 关闭菜单并提示
			closeContextMenu();
			showToast(`成功复制计划：${newPlan.Name}`, 'success');
		} catch (error) {
			console.error('复制计划失败：', error);
			closeContextMenu();
			showToast('复制计划失败，请重试', 'error');
		}
	});

	// 删除计划功能（优化错误处理）
	$('#deletePlanItem').off('click.planContextMenu').on('click.planContextMenu', async function() {
		if (!currentClickPlan) {
			showToast('未选中任何计划', 'warning');
			return;
		}

		// 二次确认，提升用户体验
		if (!confirm(`确定要删除计划「${currentClickPlan.Name || '未命名计划'}」吗？`)) {
			return;
		}

		try {
			showToast('正在删除计划...', 'loading');

			// 调用删除函数
			await deletePlan(currentClickPlan.ID);

			// 关闭菜单
			closeContextMenu();
			showToast('计划删除成功', 'success');
		} catch (error) {
			console.error('右键删除计划失败：', error);
			closeContextMenu();
			showToast('删除计划失败，请重试', 'error');
		}
	});

	// 切换晒图状态功能（核心修复：字段不存在问题）
	$('#togglePostPictureItem').off('click.planContextMenu').on('click.planContextMenu', async function() {
		if (!currentClickPlan) {
			showToast('未选中任何计划', 'warning');
			return;
		}

		try {
			// showToast('正在更新晒图状态...', 'loading');

			// 核心修复：先标准化状态（处理字段不存在/非法值），再切换
			const currentStatus = getNormalizedPostPictureStatus(currentClickPlan);
			currentClickPlan.PostPictures = currentStatus === 1 ? 0 : 1;

			const statusText = currentClickPlan.PostPictures === 1 ? '已晒图' : '未晒图';

			// 保存数据到文件
			await saveDataToJsonFile();

			// 刷新视图（同步更新菜单文本）
			refreshTimeline();
			updatePostPictureMenuText(currentClickPlan);

			// 关闭菜单并提示
			closeContextMenu();
			showToast(`计划晒图状态已更新为：${statusText}`, 'success');
		} catch (error) {
			console.error('切换晒图状态失败：', error);
			closeContextMenu();
			showToast('切换晒图状态失败，请重试', 'error');
		}
	});

	// ========== 额外优化：窗口大小变化时重置菜单位置 ==========
	$(window).off('resize.planContextMenu').on('resize.planContextMenu', function() {
		closeContextMenu();
	});

	// ========== 清理函数（可选：用于页面销毁时） ==========
	this.destroy = function() {
		// 解绑所有命名空间事件，避免内存泄漏
		$planItems.off('.planContextMenu');
		$(document).off('.planContextMenu');
		$(window).off('.planContextMenu');
		$('#copyPlanItem, #deletePlanItem, #togglePostPictureItem').off('.planContextMenu');
		closeContextMenu();
		currentClickPlan = null;
	};
}

// ===================== 计划块拖动功能 =====================
/**
 * 初始化计划块拖动功能
 */
function initPlanDrag() {
	let isDragging = false;
	let dragStartX = 0;
	let dragStartLeft = 0;
	let currentDraggingPlan = null;
	let currentDraggingElement = null;

	// 获取所有日期列的位置信息
	function getDateColumnPositions() {
		const positions = [];
		const $headerDates = $('#timelineHeader .timeline-date-item');
		const dateCellWidth = $headerDates.eq(0).outerWidth() || CONFIG.dateCellWidth;

		$headerDates.each(function(index) {
			const dateText = $(this).find('.date-text').text();
			positions.push({
				index: index,
				left: index * dateCellWidth,
				width: dateCellWidth,
				date: dateText,
				center: index * dateCellWidth + dateCellWidth / 2
			});
		});

		return positions;
	}

	// 找到最近的日期列（使用计划块左边界计算）
	function findNearestDateColumn(x) {
		const columns = getDateColumnPositions();
		let nearest = columns[0];
		let minDistance = Math.abs(x - nearest.left);

		columns.forEach(column => {
			const distance = Math.abs(x - column.left);
			if (distance < minDistance) {
				minDistance = distance;
				nearest = column;
			}
		});

		return nearest;
	}

	// 更新计划数据的日期（核心修复版本）
	async function updatePlanDates(planId, startDateStr) {
		try {
			showToast('正在更新计划日期...', 'info');

			const planIndex = orderPlans.findIndex(p => String(p.ID) === String(planId));
			if (planIndex === -1) {
				showToast('未找到对应的计划数据', 'error');
				return;
			}

			const plan = orderPlans[planIndex];
			const startDate = new Date(startDateStr);

			// 验证日期有效性
			if (isNaN(startDate.getTime())) {
				showToast('无效的日期格式', 'error');
				return;
			}

			// 获取原计划的时长（天数）
			let planDuration = 1;
			if (plan.ReleasePlans && Array.isArray(plan.ReleasePlans) && plan.ReleasePlans.length > 0) {
				const originalStartDate = new Date(plan.ReleasePlans[0].ReleaseDate);
				const originalEndDate = new Date(plan.ReleasePlans[plan.ReleasePlans.length - 1].ReleaseDate);
				planDuration = Math.ceil((originalEndDate - originalStartDate) / (1000 * 60 * 60 * 24)) + 1;
			}

			// 按新的开始日期和原时长更新所有明细日期
			plan.ReleasePlans = plan.ReleasePlans || [];
			for (let i = 0; i < planDuration; i++) {
				const newDate = new Date(startDate);
				newDate.setDate(newDate.getDate() + i);

				// 更新现有明细或创建新明细
				if (i < plan.ReleasePlans.length) {
					plan.ReleasePlans[i].ReleaseDate = newDate;
				} else {
					plan.ReleasePlans.push({
						ReleaseDate: newDate,
						ReleaseQuantity: plan.ReleasePlans[0]?.ReleaseQuantity || 1,
						ReleaseName: ''
					});
				}
			}

			// 如果计划时长和明细数量不匹配，截断多余的
			if (plan.ReleasePlans.length > planDuration) {
				plan.ReleasePlans = plan.ReleasePlans.slice(0, planDuration);
			}

			// 关键修复：等待保存完成后再刷新视图
			await saveDataToJsonFile();

			// 刷新视图
			refreshTimeline();

			// 提示更新结果
			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + planDuration - 1);
			showToast(`计划已更新至 ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`, 'success');

		} catch (error) {
			console.error('更新计划日期失败：', error);
			showToast('更新计划日期失败，请重试', 'error');
		}
	}

	// 绑定鼠标按下事件
	$('.timeline-plan-item').mousedown(function(e) {
		// 右键菜单优先级更高
		if (e.button === 2) return;

		isDragging = false;
		dragStartX = e.clientX;
		dragStartLeft = parseInt($(this).css('left')) || 0;
		currentDraggingPlan = $(this).data('plan-id');
		currentDraggingElement = this;

		// 添加拖动状态类
		$(this).addClass('dragging');

		// 阻止文本选择
		e.preventDefault();
	});

	// 鼠标移动事件
	$(document).mousemove(function(e) {
		if (!currentDraggingElement) return;

		const dx = e.clientX - dragStartX;

		// 达到拖动阈值才开始拖动
		if (!isDragging && Math.abs(dx) > CONFIG.dragThreshold) {
			isDragging = true;
		}

		if (isDragging) {
			// 计算新的left值
			let newLeft = dragStartLeft + dx;
			const $plan = $(currentDraggingElement);

			// 更新计划块位置
			$plan.css('left', newLeft + 'px');

			// 吸附效果 - 实时显示吸附位置
			const columns = getDateColumnPositions();
			const planLeft = newLeft;
			const nearestColumn = findNearestDateColumn(planLeft);

			// 添加吸附提示
			$plan.attr('data-snap-date', nearestColumn.date);
		}
	});

	// 鼠标释放事件（修复版）
	$(document).mouseup(function(e) {
		if (!isDragging || !currentDraggingElement) {
			// 清除拖动状态
			if (currentDraggingElement) {
				$(currentDraggingElement).removeClass('dragging');
			}
			isDragging = false;
			currentDraggingElement = null;
			currentDraggingPlan = null;
			return;
		}

		// 关键修复：先保存当前拖动的计划ID到局部变量
		const planId = currentDraggingPlan;
		const $plan = $(currentDraggingElement);
		const planLeft = parseInt($plan.css('left'));
		const nearestColumn = findNearestDateColumn(planLeft);

		// 动画过渡到吸附位置
		$plan.animate({
			left: nearestColumn.left + 'px'
		}, 200, async function() {
			// 使用保存的planId，而不是已经被置为null的currentDraggingPlan
			await updatePlanDates(planId, nearestColumn.date);

			// 清除拖动状态
			$plan.removeClass('dragging');
			$plan.removeAttr('data-snap-date');
		});

		// 重置拖动状态
		isDragging = false;
		currentDraggingElement = null;
		currentDraggingPlan = null;
	});

	// 鼠标离开窗口时取消拖动
	$(document).mouseleave(function() {
		if (isDragging && currentDraggingElement) {
			$(currentDraggingElement).removeClass('dragging');
		}
		isDragging = false;
		currentDraggingElement = null;
		currentDraggingPlan = null;
	});
}

// ===================== 工具函数 =====================
/**
 * 显示Toast提示
 * @param {string} message 提示信息
 * @param {string} type 类型：success/error/info/warning
 * @param {number} duration 显示时长(ms)
 */
function showToast(message, type = 'info', duration = 3000) {
	const $container = $('#toastContainer');
	const iconMap = {
		success: '<i class="fa fa-check-circle"></i>',
		error: '<i class="fa fa-exclamation-circle"></i>',
		info: '<i class="fa fa-info-circle"></i>',
		warning: '<i class="fa fa-exclamation-triangle"></i>'
	};
	if (type === 'success' || type === 'info') return;

	const $toast = $(`
        <div class="toast ${type}">
            ${iconMap[type] || ''}
            <span>${message}</span>
        </div>
    `);

	$container.append($toast);

	setTimeout(() => {
		$toast.remove();
	}, duration);
}

/**
 * 格式化日期（仅日期 YYYY-MM-DD）
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDateOnly(date) {
	if (!date || isNaN(date.getTime())) {
		console.warn('无效的日期对象：', date);
		return '';
	}
	return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

/**
 * 格式化日期时间（YYYY-MM-DD HH:mm:ss）
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的字符串
 */
function formatDate(date) {
	if (!date || isNaN(date.getTime())) {
		console.warn('无效的日期对象：', date);
		return '';
	}
	return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

/**
 * 格式化datetime-local格式（YYYY-MM-DDTHH:mm）
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的字符串
 */
function formatDateTimeLocal(date) {
	if (!date || isNaN(date.getTime())) {
		return '';
	}
	const year = date.getFullYear();
	const month = padZero(date.getMonth() + 1);
	const day = padZero(date.getDate());
	const hour = padZero(date.getHours());
	const minute = padZero(date.getMinutes());
	return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * 数字补零
 * @param {number} num 数字
 * @returns {string} 补零后的字符串
 */
function padZero(num) {
	return num < 10 ? `0${num}` : num;
}

/**
 * 生成JSON文件名
 * @returns {string} 格式化后的文件名
 */
function getJsonFileName() {
	// 替换特殊字符，避免文件名错误
	const safeUserName = currentUserName.replace(/[\\/:*?"<>|]/g, '_');
	const safeShopName = currentShopName.replace(/[\\/:*?"<>|]/g, '_');
	return `${safeUserName}_${safeShopName}.json`;
}

/**
 * 获取JSON文件完整路径
 * @returns {string} 完整路径
 */
function getJsonFileFullPath() {
	return `${CONFIG.jsonFilePath}${getJsonFileName()}`;
}

// ===================== 新增：用户信息同步核心函数 =====================
/**
 * 同步更新localStorage中的currentUserInfo
 * @param {object} userInfo 最新的用户信息对象
 */
function syncCurrentUserInfoToLocalStorage(userInfo) {
	if (!userInfo || !userInfo.userName) {
		console.warn('同步用户信息失败：用户信息不完整');
		return;
	}
	// 更新全局变量
	currentUserInfo = {
		...userInfo
	};
	// 同步到localStorage
	localStorage.setItem('currentUserInfo', JSON.stringify(currentUserInfo));
	console.log('✅ 已同步用户信息到localStorage：', currentUserInfo);
}

/**
 * 从USER_INFO_LIST中获取当前用户的最新信息并同步到localStorage
 */
function refreshCurrentUserInfo() {
	const userInfo = USER_INFO_LIST.find(user => user.userName === currentUserName);
	if (userInfo) {
		syncCurrentUserInfoToLocalStorage(userInfo);
	} else {
		console.warn(`未找到用户【${currentUserName}】的最新信息`);
	}
}

// ===================== 用户信息操作函数（修复核心问题） =====================
/**
 * 加载用户信息从JSON文件（核心修复：确保每次都加载最新数据）
 * @returns {Promise} Promise对象
 */
async function loadUserInfoFromJson() {
	try {
		const response = await fetch(`/data/userdata.json`, {
			cache: 'no-cache', // 禁用缓存，确保获取最新数据
			method: 'GET',
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate'
			}
		});

		currentUserInfo = JSON.parse(localStorage.getItem('currentUserInfo'));

		if (response.status === 404) {
			console.log('用户信息文件不存在，使用空数据并创建文件');
			USER_INFO_LIST = [];
			await saveUserInfoToJson(); // 创建初始文件
			return USER_INFO_LIST;
		}

		if (!response.ok) {
			throw new Error(`加载用户信息失败：${response.status}`);
		}

		const userData = await response.json();
		USER_INFO_LIST = userData; // 更新全局用户数据
		console.log('✅ 成功加载最新用户数据：', USER_INFO_LIST);

		// 核心新增：加载最新数据后立即同步到localStorage
		refreshCurrentUserInfo();
		return USER_INFO_LIST;
	} catch (error) {
		console.error('[加载用户信息] 失败：', error);
		showToast('加载用户信息失败，请检查文件路径', 'error');
		return USER_INFO_LIST;
	}
}

/**
 * 保存用户信息到JSON文件
 * @returns {Promise<{success: boolean, msg: string}>} 保存结果
 */
async function saveUserInfoToJson() {
	try {
		// 确认文件名是userdata.json（匹配你实际的文件名称）
		const fileName = 'userdata.json';
		const filePath = CONFIG.jsonFilePath;

		// 调用保存接口，传递文件名和数据
		const response = await fetch('/aspx/SaveJsonFile.aspx', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
			},
			body: `fileName=${encodeURIComponent(fileName)}&filePath=${encodeURIComponent('/data/')}&data=${encodeURIComponent(JSON.stringify(USER_INFO_LIST, null, 2))}`
		});

		if (!response.ok) {
			throw new Error(`保存用户信息失败：${response.status}`);
		}

		const result = await response.json();
		if (result.success) {
			console.log('用户信息保存成功：', result.msg);

			// 核心新增：保存成功后立即同步最新信息到localStorage
			refreshCurrentUserInfo();
			return {
				success: true,
				msg: result.msg
			};
		} else {
			throw new Error(result.msg || '保存用户信息失败');
		}
	} catch (error) {
		console.error('[保存用户信息] 失败：', error);
		return {
			success: false,
			msg: `保存失败：${error.message}`
		};
	}
}

/**
 * 验证旧密码是否正确
 * @param {string} oldPwd 输入的旧密码
 * @returns {boolean} 验证结果
 */
function verifyOldPassword(oldPwd) {
	const userInfo = USER_INFO_LIST.find(user => user.userName === currentUserName);
	if (!userInfo) {
		showToast('未找到当前用户信息', 'error');
		return false;
	}
	return userInfo.password === oldPwd;
}

/**
 * 修改密码核心逻辑
 */
async function changePassword() {
	const oldPwd = $('#oldPwd').val().trim();
	const newPwd = $('#newPwd').val().trim();
	const confirmPwd = $('#confirmPwd').val().trim();

	// 基础验证
	if (!oldPwd) {
		showToast('请输入旧密码', 'error');
		return;
	}
	if (!newPwd) {
		showToast('请输入新密码', 'error');
		return;
	}
	if (newPwd !== confirmPwd) {
		showToast('两次输入的新密码不一致', 'error');
		return;
	}
	if (oldPwd === newPwd) {
		showToast('新密码不能与旧密码相同', 'error');
		return;
	}

	// 验证旧密码
	const isPwdCorrect = verifyOldPassword(oldPwd);
	if (!isPwdCorrect) {
		showToast('旧密码输入错误', 'error');
		return;
	}

	// 更新密码
	const userIndex = USER_INFO_LIST.findIndex(user => user.userName === currentUserName);
	if (userIndex === -1) {
		showToast('未找到当前用户信息', 'error');
		return;
	}

	USER_INFO_LIST[userIndex].password = newPwd;
	USER_INFO_LIST[userIndex].updateTime = new Date().toISOString();

	// 保存修改
	const saveResult = await saveUserInfoToJson();
	if (saveResult.success) {
		showToast('密码修改成功，即将退出登录', 'success');
		// 关闭模态框
		$('#changePwdModal').modal('hide');

		// 直接清除缓存并退出，无需询问
		setTimeout(() => {
			// 清除所有登录相关缓存
			localStorage.removeItem('currentUserName');
			localStorage.removeItem('isAdmin');
			localStorage.removeItem(`currentShop_${currentUserName}`);
			// 直接跳转到登录页
			window.location.href = 'login.html';
		}, 2000);
	} else {
		showToast(saveResult.msg, 'error');
	}
}

/**
 * 新增店铺核心逻辑（修复：保存后立即刷新店铺列表）
 */
async function addNewShop() {
	const newShopName = $('#newShopName').val().trim();
	if (!newShopName) {
		showToast('请输入店铺名称', 'error');
		return;
	}

	// 获取当前用户信息
	const userIndex = USER_INFO_LIST.findIndex(user => user.userName === currentUserName);
	if (userIndex === -1) {
		showToast('未找到当前用户信息', 'error');
		return;
	}

	// 检查店铺是否已存在
	const currentUser = USER_INFO_LIST[userIndex];
	if (!currentUser.shopList) {
		currentUser.shopList = [];
	}
	const shopExists = currentUser.shopList.some(shop => shop.shopName === newShopName);
	if (shopExists) {
		showToast('该店铺名称已存在', 'error');
		return;
	}

	// 新增店铺
	currentUser.shopList.push({
		shopName: newShopName
	});
	currentUser.updateTime = new Date().toISOString();

	// 保存修改
	const saveResult = await saveUserInfoToJson();
	if (saveResult.success) {
		showToast(`店铺【${newShopName}】新增成功，页面即将刷新`, 'success');
		// 关闭模态框
		$('#addShopModal').modal('hide');
		// 核心修复：刷新前重新加载用户数据并更新店铺列表
		setTimeout(async () => {
			await loadUserInfoFromJson(); // 重新加载最新的用户数据
			getUserShopList(); // 重新获取店铺列表
			initShopSwitcher(); // 重新初始化店铺导航栏
			// 核心新增：强制同步最新用户信息到localStorage
			refreshCurrentUserInfo();
			window.location.reload(); // 最后刷新页面
		}, 1500);
	} else {
		showToast(saveResult.msg, 'error');
	}
}

// ===================== 店铺切换核心函数（核心修复） =====================
/**
 * 获取当前用户的店铺列表（确保从最新的USER_INFO_LIST读取）
 */
function getUserShopList() {
	console.log('🔍 获取当前用户店铺列表，用户名：', currentUserName);
	console.log('🔍 当前用户数据：', USER_INFO_LIST.find(user => user.userName === currentUserName));

	const userInfo = USER_INFO_LIST.find(user => user.userName === currentUserName);
	if (userInfo && userInfo.shopList && Array.isArray(userInfo.shopList)) {
		// 核心修复：确保正确提取店铺名称
		userShopList = userInfo.shopList.map(item => {
			// 兼容不同的数据格式
			if (typeof item === 'string') return item;
			return item.shopName || '';
		}).filter(shopName => shopName.trim() !== ''); // 过滤空值
		console.log('✅ 提取到的店铺列表：', userShopList);
	} else {
		userShopList = ['默认店铺'];
		console.log('⚠️ 未找到店铺列表，使用默认店铺');
	}

	// 首次加载默认选第一个店铺
	const savedShop = localStorage.getItem(`currentShop_${currentUserName}`);
	currentShopName = savedShop && userShopList.includes(savedShop) ? savedShop : userShopList[0];
	console.log('✅ 当前选中店铺：', currentShopName);
}

/**
 * 初始化店铺切换按钮（确保每次都重新生成）
 */
function initShopSwitcher() {
	const $shopBtnGroup = $('#shopBtnGroup');
	if (!$shopBtnGroup || userShopList.length === 0) {
		console.log('⚠️ 店铺按钮容器不存在或店铺列表为空');
		return;
	}

	// 清空原有按钮
	$shopBtnGroup.empty();
	console.log('🔄 重新生成店铺按钮，店铺列表：', userShopList);

	// 生成店铺按钮
	userShopList.forEach(shopName => {
		const $btn = $(
			`<button class="shop-btn ${shopName === currentShopName ? 'active' : ''}">${shopName}</button>`);

		// 点击事件：切换店铺并加载数据
		$btn.click(function() {
			// 更新选中状态
			$('.shop-btn').removeClass('active');
			$(this).addClass('active');

			// 更新当前店铺
			currentShopName = shopName;

			// 保存到本地存储
			localStorage.setItem(`currentShop_${currentUserName}`, currentShopName);

			// 加载对应店铺数据
			loadDataFromJson();

			// 新增：点击店铺后关闭移动端店铺列表
			$('#shopSwitcher').removeClass('show');
		});

		$shopBtnGroup.append($btn);
	});
	console.log('✅ 店铺按钮生成完成');
}

// ===================== 数据加载/保存函数 =====================
/**
 * 加载本地JSON文件数据
 * @returns {Promise} Promise对象
 */
async function loadUserData() {
	try {
		const jsonFileFullPath = getJsonFileFullPath();
		console.log(`[加载数据] 尝试加载文件：${jsonFileFullPath}`);

		// 直接加载本地JSON文件
		const response = await fetch(jsonFileFullPath, {
			cache: 'no-cache',
			method: 'GET'
		});

		// 文件不存在（404），创建空文件并返回空数据
		if (response.status === 404) {
			console.log(`[加载数据] 文件不存在，将创建空文件：${jsonFileFullPath}`);
			showToast(`【${currentShopName}】数据文件不存在，已创建空文件`, 'info');
			orderPlans = [];
			// 保存空数据到文件
			await saveDataToJsonFile();
			return orderPlans;
		}

		if (!response.ok) {
			throw new Error(`文件加载失败：${response.status}`);
		}

		const rawData = await response.json();

		// 解析数据（保持原有解析逻辑）
		if (Array.isArray(rawData)) {
			orderPlans = rawData.map((innerItem, index) => {
				const planObj = Array.isArray(innerItem) ? innerItem[1] : innerItem;
				if (!planObj) return null;

				const postPictures = Number(planObj.PostPictures);
				const normalizedPostPictures = isNaN(postPictures) ? 0 : postPictures;

				return {
					ID: planObj.ID || index + 1,
					Code: planObj.Code || '',
					Name: planObj.Name || '',
					SkuName: planObj.SkuName || '',
					SkuPrice: planObj.SkuPrice || '',
					PostPictures: normalizedPostPictures, // 使用标准化的数字值
					createTime: planObj.createTime ? new Date(planObj.createTime) : new Date(),
					ReleasePlans: planObj.ReleasePlans ? planObj.ReleasePlans.map(detail => ({
						ReleaseDate: detail.ReleaseDate ? new Date(detail.ReleaseDate) :
							new Date(),
						ReleaseQuantity: detail.ReleaseQuantity || 0,
						ReleaseName: detail.ReleaseName || ''
					})) : []
				};
			}).filter(item => item !== null);
		} else {
			orderPlans = [];
		}

		console.log(`[加载数据] 加载完成，共${orderPlans.length}条数据`);
		return orderPlans;
	} catch (err) {
		console.error('[加载数据] 加载失败：', err);
		// 加载失败时使用空数据
		orderPlans = [];
		showToast(`加载【${currentShopName}】数据失败，使用空数据`, 'warning');
		return orderPlans;
	}
}

/**
 * 保存数据到本地JSON文件
 * @returns {Promise<{success: boolean, msg: string}>} 保存结果
 */
async function saveDataToJsonFile() {
	try {
		const jsonFileFullPath = getJsonFileFullPath();
		// 格式化数据（保持原有格式）
		const saveData = orderPlans.map(plan => ({
			ID: plan.ID,
			Code: plan.Code,
			Name: plan.Name,
			SkuName: plan.SkuName,
			SkuPrice: plan.SkuPrice,
			createTime: plan.createTime.toISOString(),
			PostPictures: plan.PostPictures !== undefined ? plan.PostPictures : 0,
			ReleasePlans: plan.ReleasePlans.map(detail => ({
				ReleaseDate: formatDateOnly(detail.ReleaseDate),
				ReleaseQuantity: detail.ReleaseQuantity,
				ReleaseName: detail.ReleaseName
			}))
		}));

		// 前端无法直接创建文件，需要后端接口配合
		// 调用保存接口，传递文件名和数据
		const response = await fetch('/aspx/SaveJsonFile.aspx', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
			},
			body: `fileName=${encodeURIComponent(getJsonFileName())}&filePath=${encodeURIComponent(CONFIG.jsonFilePath)}&data=${encodeURIComponent(JSON.stringify(saveData, null, 2))}`
		});

		if (!response.ok) {
			throw new Error(`保存请求失败：${response.status}`);
		}

		const result = await response.json();
		if (result.success) {
			showToast(`【${currentShopName}】数据保存成功`, 'success');
			return {
				success: true,
				msg: result.msg
			};
		} else {
			throw new Error(result.msg || '保存失败');
		}
	} catch (error) {
		console.error('[保存数据] 保存失败：', error);
		showToast(`【${currentShopName}】保存失败：${error.message}`, 'error');
		return {
			success: false,
			msg: `保存失败：${error.message}`
		};
	}
}

// ===================== 页面渲染函数 =====================
/**
 * 生成时间轴头部
 */
function generateTimelineHeader() {
	const $head = $('#timelineHeader');
	$head.empty();

	if (orderPlans.length === 0 || !orderPlans.some(p => p.ReleasePlans && p.ReleasePlans.length)) {
		return;
	}

	// 获取所有计划的日期范围
	const allDates = [];
	orderPlans.forEach(p => {
		if (p.ReleasePlans && Array.isArray(p.ReleasePlans)) {
			p.ReleasePlans.forEach(d => allDates.push(new Date(d.ReleaseDate)));
		}
	});

	const minD = new Date(Math.min(...allDates));
	const maxD = new Date(Math.max(...allDates));
	const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

	// 生成日期列
	$head.css('display', 'flex');
	let cur = new Date(minD);
	while (cur <= maxD) {
		const dateStr = formatDateOnly(cur);
		const weekDay = weekDays[cur.getDay()];
		$head.append(`
            <div class="timeline-date-item">
                <div class="date-text">${dateStr}</div>
                <div class="weekday-text">星期${weekDay}</div>
            </div>
        `);
		cur.setDate(cur.getDate() + 1);
	}
}

/**
 * 渲染时间轴内容
 */
function renderTimelineContent() {
	const $container = $('#timelineContent');
	$container.empty();

	if (orderPlans.length === 0) {
		$container.append(`<div class="empty-tip">【${currentShopName}】暂无时间轴数据</div>`);
		return;
	}

	// 按创建时间倒序排序
	const sortedPlans = [...orderPlans].sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

	// 获取日期列表
	const $headerDates = $('#timelineHeader .timeline-date-item');
	const headerDateList = [];
	$headerDates.each(function() {
		headerDateList.push(new Date($(this).find('.date-text').text()));
	});

	const dateCellWidth = $headerDates.eq(0).outerWidth() || CONFIG.dateCellWidth;
	const planColors = ['#428bca', '#5cb85c', '#f0ad4e', '#d9534f', '#9954bb', '#5bc0de'];
	let currentTop = 10;
	const rowHeight = CONFIG.planHeight + CONFIG.planMargin;

	// 渲染计划块
	sortedPlans.forEach((plan, planIndex) => {
		if (!plan.ReleasePlans || !Array.isArray(plan.ReleasePlans) || plan.ReleasePlans.length === 0) return;

		// 计算计划块位置
		const planTop = currentTop;
		currentTop += rowHeight;

		const planDates = plan.ReleasePlans.map(d => new Date(d.ReleaseDate));
		const firstDate = new Date(Math.min(...planDates));
		const lastDate = new Date(Math.max(...planDates));

		const startIndex = headerDateList.findIndex(d => d.setHours(0, 0, 0, 0) === firstDate.setHours(0, 0, 0,
			0));
		const endIndex = headerDateList.findIndex(d => d.setHours(0, 0, 0, 0) === lastDate.setHours(0, 0, 0,
			0));

		if (startIndex === -1 || endIndex === -1) return;

		const planWidth = (endIndex - startIndex + 1) * dateCellWidth;
		const planLeft = startIndex * dateCellWidth;
		const colorIndex = planIndex % planColors.length;
		const planColor = planColors[colorIndex];

		// 计算总数量
		const totalQuantity = plan.ReleasePlans.reduce((sum, d) => sum + (d.ReleaseQuantity || 0), 0);

		const postPicturesValue = Number(plan.PostPictures);
		const isPosted = !isNaN(postPicturesValue) && postPicturesValue === 1;

		const postPictureText = isPosted ? '已晒图' : '未晒图';
		const postPictureClass = isPosted ? 'uploaded' : 'not-uploaded';

		const $planItem = $(`
		    <div class="timeline-plan-item draggable-plan" 
		         data-plan-id="${plan.ID}" 
		         style="left:${planLeft}px; width:${planWidth}px; top:${planTop}px; background:${planColor}; cursor: move;">
		        <div class="plan-name">${plan.Name || '未知车型'} (总:${totalQuantity})</div>
		        <div class="post-picture-tag ${postPictureClass}">${postPictureText}</div>
		    </div>
		`);

		// 绑定事件和提示
		$planItem.dblclick(() => showEditPlanModal(plan.ID));
		$planItem.attr('title', `车型ID：${plan.Code || '无'}\n车型：${plan.Name || '未知车型'}\nSKU名称：${plan.SkuName}\nSKU价格：${plan.SkuPrice || '0.00'}\n总数量：${totalQuantity}\n${
            plan.ReleasePlans.map(d => `${formatDateOnly(d.ReleaseDate)} ${d.ReleaseQuantity}单（${d.ReleaseName || '无备注'}）`).join('\n')
        }`);

		$container.append($planItem);
	});

	// 渲染今日红线
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIndex = headerDateList.findIndex(d => d.setHours(0, 0, 0, 0) === today.getTime());

	if (todayIndex !== -1) {
		const lineX = (todayIndex * dateCellWidth) + (dateCellWidth / 2);
		const scrollHeight = $container[0].scrollHeight;
		const $todayLine = $(`
            <div class="timeline-current-line" 
                 style="left:${lineX}px; top:0; height:${scrollHeight}px; width:2px; background-color:var(--error-color); position:absolute; z-index:999;">
            </div>
        `);
		$container.append($todayLine);
		$container.scrollLeft(lineX - $container.width() / 2);
	}

	// ========== 新增：渲染完成后初始化右键菜单 ==========
	initPlanContextMenu();
}

/**
 * 刷新时间轴
 */
function refreshTimeline() {
	generateTimelineHeader();
	renderTimelineContent();
	// 确保右键菜单重新初始化
	initPlanContextMenu();
	// 初始化拖动功能
	initPlanDrag();
}

// 刷新计划表格（按createTime倒序排序+修复显示问题）
function refreshOrderPlanTable() {
	console.log(`【刷新计划表格】开始执行，当前店铺：${currentShopName}，orderPlans长度：`, orderPlans.length);
	const $tbody = $('#planTableBody'); // 你的表格tbody ID
	$tbody.empty();
	if (orderPlans.length === 0) {
		console.log(`【刷新计划表格】${currentShopName}无数据，显示空提示`);
		$tbody.append(`<tr><td colspan="6" class="text-center">【${currentShopName}】暂无计划数据</td></tr>`);
		return;
	}

	// 【核心修复】按createTime倒序排序（新增的计划在最上方）
	const sortedPlans = [...orderPlans].sort((a, b) => {
		// 转成Date对象比较，确保排序准确
		return new Date(b.createTime) - new Date(a.createTime);
	});

	sortedPlans.forEach((plan, index) => {
		console.log(`【刷新计划表格】渲染表格行${index}：${plan.Name || '未知车型'}`);
		// 拼接放单日期+数量（保留你原有显示规则）
		const releaseInfo = plan.ReleasePlans && Array.isArray(plan.ReleasePlans) ?
			plan.ReleasePlans.map(d => `${formatDateOnly(d.ReleaseDate)}(${d.ReleaseQuantity}单)`).join('<br>') :
			'无';

		// 保留你原有表格列结构，添加data-label属性适配卡片布局
		const $tr = $(`
            <tr>
                <td data-label="车型ID">${plan.Code || '无'}</td>
                <td data-label="车型名称">${plan.Name || '未知车型'}</td>
                <td data-label="SKU名称">${plan.SkuName || '未指定'}</td>
                <td data-label="SKU价格">${plan.SkuPrice || '未固定'}</td>
                <td data-label="创建时间">${formatDate(plan.createTime)}</td>
                <td data-label="操作">
                    <button class="btn btn-sm btn-primary btn-edit" data-id="${plan.ID || index}">编辑</button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${plan.ID || index}">删除</button>
                </td>
            </tr>
        `);
		$tbody.append($tr);
	});

	// 绑定编辑/删除事件（保留你原有逻辑）
	console.log('【刷新计划表格】绑定编辑/删除按钮事件');
	$('.btn-edit').off('click').click(function() {
		const planId = $(this).data('id');
		console.log(`【按钮点击】编辑按钮被点击，计划ID：${planId}`);
		showEditPlanModal(planId);
	});
	$('.btn-delete').off('click').click(function() {
		const planId = $(this).data('id');
		console.log(`【按钮点击】删除按钮被点击，计划ID：${planId}`);
		deletePlan(planId);
	});
	console.log('【刷新计划表格】执行完成，已按createTime倒序排序');
}

// ===================== 订单查询功能 =====================
/**
 * 初始化订单查询弹窗
 */
function initOrderQueryModal() {
	// 初始化店铺下拉框
	initOrderQueryShopSelect();

	// 设置默认查询日期为今日
	const today = new Date();
	const todayStr = formatDateOnly(today);
	$('#queryDate').val(todayStr);

	// 绑定查询按钮事件
	$('#btnQueryOrder').off('click').on('click', queryOrderData);

	// 绑定重置按钮事件
	$('#btnResetQuery').off('click').on('click', resetOrderQuery);

	// 绑定复制表格按钮事件
	$('#btnCopyOrderTable').off('click').on('click', copyOrderTableContent);

	// 绑定打开订单查询弹窗事件
	$('#btnQueryOrderInfo').off('click').on('click', function() {
		// 每次打开弹窗时重新初始化店铺下拉框
		initOrderQueryShopSelect();
		// 显示弹窗
		$('#orderQueryModal').modal('show');
	});
}

/**
 * 初始化订单查询的店铺下拉框
 */
function initOrderQueryShopSelect() {
	const $shopSelect = $('#queryShopName');
	$shopSelect.empty();

	// 添加用户的所有店铺选项
	userShopList.forEach(shopName => {
		const $option = $(`<option value="${shopName}">${shopName}</option>`);
		// 默认选中当前店铺
		if (shopName === currentShopName) {
			$option.prop('selected', true);
		}
		$shopSelect.append($option);
	});
}

/**
 * 重置订单查询条件（适配Excel格式表格）
 */
function resetOrderQuery() {
	// 重置店铺为当前选中店铺
	$('#queryShopName').val(currentShopName);

	// 重置日期为今日
	const today = new Date();
	const todayStr = formatDateOnly(today);
	$('#queryDate').val(todayStr);

	// ========== 适配Excel格式的空提示 ==========
	$('#orderResultTableBody').html(`
        <tr>
            <td colspan="13" style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:center;" class="text-muted">请点击查询按钮获取订单数据</td>
        </tr>
    `);
}

async function queryOrderData() {
	try {
		// 获取查询条件
		const shopName = $('#queryShopName').val().trim();
		const queryDate = $('#queryDate').val().trim();

		// 验证条件
		if (!shopName) {
			showToast('请选择店铺名称', 'error');
			return;
		}

		if (!queryDate) {
			showToast('请选择查询日期', 'error');
			return;
		}

		const cjfId = getCjfIdByShopName(shopName);
		if (!cjfId) {
			showToast('未找到该店铺对应的cjfId', 'error');
			return;
		}

		// 关键修改：添加await等待cookie获取完成
		const cookie = await QueryCjfInfo(cjfId);
		// 校验cookie是否有效
		if (!cookie) {
			showToast('获取店铺Cookie失败，无法继续查询', 'error');
			return;
		}

		showToast('正在查询订单数据，请稍候...', 'info');

		// 构建请求URL：改为请求自己的aspx中转接口
		const encodedShopName = encodeURIComponent(shopName);
		const encodedCookie = encodeURIComponent(cookie); // 新增：cookie含特殊字符，必须编码
		// 注意替换为你实际的aspx文件路径（比如你的项目根目录是public，那么路径是/aspx/QueryOrderProxy.aspx）
		const proxyApiUrl =
			`/aspx/QueryOrderProxy.aspx?shopName=${encodedShopName}&queryDate=${queryDate}&cookie=${encodedCookie}`;

		// 发送请求（请求自己的后端，无跨域问题）
		const response = await fetch(proxyApiUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			cache: 'no-cache'
		});

		if (!response.ok) {
			throw new Error(`请求失败：${response.status}`);
		}

		const result = await response.json();

		// 处理返回结果（逻辑和原来一致）
		if (result.code === 200 && result.data && result.data.list) {
			renderOrderTable(result.data.list);
			showToast(`查询成功，共找到 ${result.data.list.length} 条订单`, 'success');
		} else {
			$('#orderResultTableBody').html(`
                <tr>
                    <td colspan="23" class="text-center text-muted">${result.msg || '未查询到订单数据'}</td>
                </tr>
            `);
			showToast(result.msg || '未查询到订单数据', 'info');
		}
	} catch (error) {
		console.error('查询订单失败：', error);
		$('#orderResultTableBody').html(`
            <tr>
                <td colspan="13" class="text-center text-danger">查询失败：${error.message}</td>
            </tr>
        `);
		showToast(`查询失败：${error.message}`, 'error');
	}
}

/**
 * 查询超级返信息
 */
function QueryCjfInfo(cjfId) {
	// 关键：返回整个fetch的Promise链
	return fetch(`/data/cjfInfo.json?_=${new Date().getTime()}`, {
			cache: 'no-cache'
		})
		.then(response => {
			if (response.ok) return response.json();
			throw new Error('获取超级返信息数据失败');
		})
		.then(cjfData => {
			if (!Array.isArray(cjfData)) {
				throw new Error('超级返信息数据格式错误');
			}

			// 查找信息
			const user = cjfData.find(u => u.id === cjfId);

			if (!user) { // 新增：处理未找到匹配数据的情况
				throw new Error('未找到该cjfId对应的超级返信息');
			}

			// 深拷贝用户对象，避免修改原数据
			const userInfo = JSON.parse(JSON.stringify(user));
			return userInfo.cookie; // 最终返回cookie字符串
		})
		.catch(err => {
			showToast(err.message, 'error');
			return ""; // 异常时返回空字符串，保证调用处有返回值
		});
}

/**
 * 根据shopName从localStorage的currentUserInfo中获取对应的cjfId
 * @param {string} targetShopName - 要查找的店铺名称
 * @returns {string|null} 匹配的cjfId，未找到/数据异常时返回null
 */
function getCjfIdByShopName(targetShopName) {
	try {
		// 1. 从localStorage中获取currentUserInfo字符串
		const userInfoStr = localStorage.getItem('currentUserInfo');
		// 校验：localStorage中无该数据时返回null
		if (!userInfoStr) {
			console.warn('localStorage中未找到currentUserInfo');
			return null;
		}

		// 2. 将JSON字符串解析为JS对象
		const currentUserInfo = JSON.parse(userInfoStr);
		// 校验：解析后的数据结构是否包含shopList
		if (!currentUserInfo || !Array.isArray(currentUserInfo.shopList)) {
			console.warn('currentUserInfo中shopList格式异常');
			return null;
		}

		// 3. 遍历shopList，根据shopName匹配对应的cjfId
		// find方法：找到第一个匹配的元素，未找到返回undefined
		const targetShop = currentUserInfo.shopList.find(shop => {
			// 严格匹配shopName（如需模糊匹配，可改为shop.shopName.includes(targetShopName)）
			return shop.shopName === targetShopName;
		});

		// 4. 返回结果：找到则返回cjfId，未找到返回null
		return targetShop ? targetShop.cjfId : null;

	} catch (error) {
		// 捕获解析JSON、数据访问等异常
		console.error('获取cjfId失败：', error);
		return null;
	}
}

/**
 * 渲染订单表格（适配Excel原生格式）
 * @param {Array} orderList 订单列表数据
 */
function renderOrderTable(orderList) {
	const $tbody = $('#orderResultTableBody');
	$tbody.empty();

	if (!Array.isArray(orderList) || orderList.length === 0) {
		$tbody.html(`
            <tr>
                <td colspan="13" class="text-center text-muted">未查询到订单数据</td>
            </tr>
        `);
		return;
	}

	// 渲染每一行订单数据（适配Excel原生格式）
	orderList.forEach((order, index) => {
		// 字段映射和单位转换（接口返回的是分，转换为元）
		const productId = order.productId || '';
		const paySuccessTime = formatPayTime(order.paySuccessTime ? order.paySuccessTime.split(' ')[0] :
			''); // 只保留日期部分
		const shopName = order.shopName || '';
		const innerOrderNo = ''; // 内部单号为空
		const orderId = order.orderId || '';
		const feigeAccount = ''; // 飞鸽账号为空
		const doudianPrice = order.doudianPrice ? (order.doudianPrice / 100).toFixed(0) : '0'; // 本金（转元，取整）
		const spreadUnitPrice = order.spreadUnitPrice ? (order.spreadUnitPrice / 100).toFixed(0) :
			'0'; // 佣金（转元，取整）
		const goldCoinCosts = order.goldCoinCosts ? (order.goldCoinCosts / 100).toFixed(0) : '0'; // 金币（转元，取整）
		const evaluateCost = '0'; // 评价花费为0

		// 计算合计：本金+佣金+金币+评价花费
		const total = (parseInt(doudianPrice) + parseInt(spreadUnitPrice) + parseInt(goldCoinCosts) + parseInt(
			evaluateCost)).toString();
		const remark = ''; // 备注为空
		// 计算佣金合计：佣金+金币+评价花费
		const commissionTotal = (parseInt(spreadUnitPrice) + parseInt(goldCoinCosts) + parseInt(evaluateCost))
			.toString();

		// ========== 核心修改：适配Excel原生格式 ==========
		// 1. 移除多余样式，使用纯文本格式
		// 2. 添加data-excel-value属性存储纯文本值（用于复制）
		// 3. 单元格内容仅保留纯文本，无HTML标签
		const $tr = $(`
            <tr style="height:25px;">
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${productId}">${productId}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${paySuccessTime}">${paySuccessTime}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${shopName}">${shopName}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${innerOrderNo}">${innerOrderNo}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${orderId}">${orderId}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${feigeAccount}">${feigeAccount}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${doudianPrice}">${doudianPrice}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${spreadUnitPrice}">${spreadUnitPrice}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${goldCoinCosts}">${goldCoinCosts}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${evaluateCost}">${evaluateCost}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${total}">${total}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px;" data-excel-value="${remark}">${remark}</td>
                <td style="padding:2px 5px; border:1px solid #ddd; font-size:12px; text-align:right;" data-excel-value="${commissionTotal}">${commissionTotal}</td>
            </tr>
        `);

		$tbody.append($tr);
	});
}

// 定义格式化日期的函数
function formatPayTime(paySuccessTime) {
	// 校验入参是否为有效字符串
	if (!paySuccessTime || typeof paySuccessTime !== 'string') {
		return ''; // 入参无效时返回空字符串，也可根据需求改为'日期格式错误'
	}

	// 按横杠分割日期字符串，得到 [年, 月, 日]
	const [year, month, day] = paySuccessTime.split('-');

	// 去除月份的前导零（如'02'转为2），日期保持原样
	const monthWithoutZero = parseInt(month, 10);

	// 拼接成 月.日 格式
	return `${monthWithoutZero}.${day}`;
}

/**
 * 复制订单表格内容（原生Excel格式）
 */
function copyOrderTableContent() {
	try {
		// ========== 核心修改：按Excel原生格式拼接数据 ==========
		let excelContent = '';

		// 1. 拼接表头（Excel原生格式，制表符分隔）
		$('#orderResultTable thead tr th').each(function(index) {
			const headerText = $(this).text().trim().replace(/\s+/g, ' '); // 清理多余空格
			excelContent += headerText + '\t'; // 制表符分隔（Excel列分隔符）
		});
		excelContent = excelContent.replace(/\t$/, '') + '\r\n'; // 替换最后一个制表符，换行用\r\n（Excel标准）

		// 2. 拼接表格内容（使用data-excel-value获取纯文本值）
		$('#orderResultTable tbody tr').each(function() {
			let rowContent = '';
			$(this).find('td').each(function() {
				// 优先使用data-excel-value的纯文本值，适配Excel格式
				const cellValue = $(this).data('excel-value') || $(this).text().trim().replace(/\s+/g,
					' ');
				rowContent += cellValue + '\t';
			});
			const trimmedRow = rowContent.replace(/\t$/, ''); // 移除行末尾制表符
			if (trimmedRow && !trimmedRow.includes('未查询到订单数据')) { // 过滤空行和提示行
				excelContent += trimmedRow + '\r\n';
			}
		});

		// 3. 移除最后一个换行符，避免空行
		excelContent = excelContent.replace(/\r\n$/, '');

		// 4. 复制到剪贴板（适配Excel的原生格式）
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(excelContent).then(() => {
				showToast('表格内容已按Excel格式复制，可直接粘贴到Excel', 'success');
			}).catch((err) => {
				fallbackCopyTextToClipboard(excelContent);
			});
		} else {
			fallbackCopyTextToClipboard(excelContent);
		}

	} catch (error) {
		console.error('复制表格失败：', error);
		showToast('复制失败，请手动复制', 'error');
	}
}

// 降级复制函数（优化传统方式的兼容性，适配Excel格式）
function fallbackCopyTextToClipboard(text) {
	const tempTextarea = document.createElement('textarea');
	// 设置textarea样式适配纯文本（避免格式错乱）
	tempTextarea.style.position = 'absolute';
	tempTextarea.style.left = '-9999px';
	tempTextarea.style.top = '0';
	tempTextarea.style.fontFamily = 'monospace'; // 等宽字体，适配Excel
	tempTextarea.style.fontSize = '12px';
	tempTextarea.value = text;

	document.body.appendChild(tempTextarea);
	tempTextarea.focus();
	tempTextarea.select();
	tempTextarea.setSelectionRange(0, text.length); // 兼容移动设备

	try {
		const successful = document.execCommand('copy');
		if (successful) {
			showToast('表格内容已按Excel格式复制，可直接粘贴到Excel', 'success');
		} else {
			throw new Error('execCommand copy 返回失败');
		}
	} catch (err) {
		console.error('降级复制失败：', err);
		showToast('复制失败，请手动复制', 'error');
	} finally {
		document.body.removeChild(tempTextarea);
	}
}

// ===================== 交互函数 =====================
/**
 * 初始化页面（核心修复：确保数据加载完成后再初始化店铺列表）
 */
async function initPage() {
	console.log('🚀 开始初始化页面');

	// 关键修复：先加载最新的用户信息（强制刷新）
	await loadUserInfoFromJson();

	// 获取当前用户的店铺列表（使用最新数据）
	getUserShopList();

	// 初始化店铺切换按钮（基于最新的店铺列表）
	initShopSwitcher();

	// 绑定事件
	bindEvents();

	// 加载数据并渲染（首次加载第一个店铺）
	loadDataFromJson();

	// 初始化视图按钮样式
	$('#btnShowTimeline').removeClass('btn-default').addClass('btn-primary');
	$('#btnShowTable').removeClass('btn-primary').addClass('btn-default');

	// 滚动同步逻辑
	initScrollSync();
	// 初始化用户下拉菜单（包含新增功能）
	initUserDropdown();

	// ========== 新增：初始化订单查询功能 ==========
	initOrderQueryModal();

	// ========== 兜底保障：重新绑定对比按钮 ==========
	setTimeout(() => {
		// 今日/明日对比按钮
		$('#btnCompareTodayTomorrow').off('click').on('click', function() {
			if (isUserValidMember()) {
				showPlanCompareModal('todayTomorrow');
			} else {
				showToast('您的会员已过期或尚未开通会员，无法使用计划对比功能，请联系管理员充值会员！', 'error', 5000);
			}
		});

		// 昨日/今日对比按钮
		$('#btnCompareYesterdayToday').off('click').on('click', function() {
			if (isUserValidMember()) {
				showPlanCompareModal('yesterdayToday');
			} else {
				showToast('您的会员已过期或尚未开通会员，无法使用计划对比功能，请联系管理员充值会员！', 'error', 5000);
			}
		});
	}, 500);

	console.log('✅ 页面初始化完成');
}

/**
 * 初始化用户下拉菜单（新增修改密码/新增店铺功能）
 */
function initUserDropdown() {
	// 用户下拉菜单
	$('#userDropdown').click(function(e) {
		e.stopPropagation();
		$('#userMenu').toggleClass('show');
	});

	// 点击其他区域关闭下拉菜单
	$(document).click(function() {
		$('#userMenu').removeClass('show');
	});

	// 退出登录按钮事件
	$('#btnAdminLogout').off('click').click(function() {
		if (confirm('确定退出后台管理系统？')) {
			localStorage.removeItem('currentUserName');
			localStorage.removeItem('isAdmin');
			localStorage.removeItem('currentUserInfo'); // 新增：清除完整用户信息
			// 清除店铺选择记录
			localStorage.removeItem(`currentShop_${currentUserName}`);
			window.location.href = 'login.html';
		}
	});

	// 修改密码按钮事件（新增）
	$('#btnChangePwd').off('click').click(function() {
		// 清空表单
		$('#changePwdForm')[0].reset();
		// 显示模态框
		$('#changePwdModal').modal('show');
	});

	// 保存密码修改按钮事件（新增）
	$('#btnSavePwd').off('click').click(changePassword);

	// 新增店铺按钮事件（新增）
	$('#btnAddShop').off('click').click(function() {
		const userInfo = USER_INFO_LIST.find(user => user.userName === currentUserName);
		const shopCount = userInfo?.shopList?.length || 0;
		if (shopCount >= 3) {
			showToast(`当前账户店铺数量已达上限(3个)，如需增加请联系管理员`, 'error');
			return;
		}
		// 清空表单
		$('#addShopForm')[0].reset();
		// 显示模态框
		$('#addShopModal').modal('show');
	});

	// 保存新增店铺按钮事件（新增）
	$('#btnSaveShop').off('click').click(addNewShop);

	// 新增：充值记录按钮事件
	$('#btnRechargeRecord').off('click').click(showRechargeRecordModal);
}

/**
 * 绑定页面事件
 */
function bindEvents() {
	// 功能按钮事件
	$('#btnAdd').off('click').click(showAddPlanModal);
	$('#btnLoadData').off('click').click(loadDataFromJson);
	// ========== 修复计划对比按钮的会员校验 ==========
	// 今日/明日对比按钮（彻底解绑后重新绑定）
	$('#btnCompareTodayTomorrow').off('click').on('click', function() {
		if (isUserValidMember()) {
			showPlanCompareModal('todayTomorrow');
		} else {
			showToast('您的会员已过期或尚未开通会员，无法使用计划对比功能，请联系管理员充值会员！', 'error', 5000);
		}
	});

	// 昨日/今日对比按钮（彻底解绑后重新绑定）
	$('#btnCompareYesterdayToday').off('click').on('click', function() {
		if (isUserValidMember()) {
			showPlanCompareModal('yesterdayToday');
		} else {
			showToast('您的会员已过期或尚未开通会员，无法使用计划对比功能，请联系管理员充值会员！', 'error', 5000);
		}
	});

	// 兼容旧的对比函数（添加会员校验）
	window.showCompareModal = function() {
		if (isUserValidMember()) {
			showPlanCompareModal('todayTomorrow');
		} else {
			showToast('您的会员已过期或尚未开通会员，无法使用计划对比功能，请联系管理员充值会员！', 'error', 5000);
		}
	};
	// $('#btnCompareTodayTomorrow').off('click').click(showCompareModal);
	// $('#btnShowTimeline').off('click').click(() => switchView('timeline'));
	$('#btnShowTimeline').off('click').click(() => {
		switchView('timeline');
		// 切换视图后重新初始化右键菜单
		setTimeout(initPlanContextMenu, 100);
	});
	$('#btnShowTable').off('click').click(() => switchView('table'));

	// 模态框相关事件
	$('#btnAddDetail').off('click').click(() => addDetailRow());
	$('#btnSaveForm').off('click').click(savePlanForm);
	$('#btnCopyCompare').off('click').click(copyCompareResult);

	// 批量初始化明细按钮事件
	$('#btnBatchInitDetail').off('click').click(showBatchInitModal);
	// 确认批量初始化按钮事件
	$('#btnConfirmBatchInit').off('click').click(executeBatchInit);

	// ===================== 新增：移动端店铺切换交互事件 =====================
	// 移动端店铺切换按钮点击事件（显示/隐藏店铺列表）
	$('#shopMobileToggle').off('click').click(function() {
		$('#shopSwitcher').toggleClass('show');
	});

	// 点击页面其他区域关闭店铺列表（排除店铺切换区域和触发按钮）
	$(document).off('click', '.shop-switcher-handler').on('click', '.shop-switcher-handler', function(e) {
		if (!$(e.target).closest('#shopSwitcher, #shopMobileToggle').length) {
			$('#shopSwitcher').removeClass('show');
		}
	});
	// 兼容直接绑定document的方式（确保生效）
	$(document).click(function(e) {
		if (!$(e.target).closest('#shopSwitcher, #shopMobileToggle').length) {
			$('#shopSwitcher').removeClass('show');
		}
	});
	// 阻止批量初始化明细模态框中回车键提交表单
	$('#batchInitModal').on('keydown', function(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			$('#btnConfirmBatchInit').focus();
		}
	});
	// 批量初始化模态框 - 天数选择联动
	$('#defaultInitDays').off('change').on('change', function() {
		const days = parseInt($(this).val());
		const startDate = $('#batchStartDate').val();

		if (days && startDate) {
			const start = new Date(startDate);
			const end = new Date(start);
			end.setDate(end.getDate() + days - 1); // 减1是因为包含开始日期

			$('#batchEndDate').val(formatDateOnly(end));

			// 如果填写了单日数量，自动生成数量字符串
			const singleQty = $('#singleQuantity').val();
			if (singleQty && singleQty > 0) {
				const qtyArray = Array(days).fill(singleQty);
				$('#batchQuantities').val(qtyArray.join(','));
			}
		}
	});

	// 开始日期变化时，重新计算结束日期
	$('#batchStartDate').off('change').on('change', function() {
		const days = parseInt($('#defaultInitDays').val());
		const startDate = $(this).val();

		if (days && startDate) {
			const start = new Date(startDate);
			const end = new Date(start);
			end.setDate(end.getDate() + days - 1);

			$('#batchEndDate').val(formatDateOnly(end));

			// 更新数量字符串
			const singleQty = $('#singleQuantity').val();
			if (singleQty && singleQty > 0) {
				const qtyArray = Array(days).fill(singleQty);
				$('#batchQuantities').val(qtyArray.join(','));
			}
		}
	});

	// 单日数量变化时，自动生成数量字符串
	$('#singleQuantity').off('change').on('change', function() {
		const days = parseInt($('#defaultInitDays').val());
		const singleQty = $(this).val();

		if (days && singleQty && singleQty > 0) {
			const qtyArray = Array(days).fill(singleQty);
			$('#batchQuantities').val(qtyArray.join(','));
		}
	});
}

/**
 * 初始化滚动同步
 */
function initScrollSync() {
	const $timelineHeader = $('#timelineHeader');
	const $timelineContent = $('#timelineContent');
	const $timelineContainer = $('#timelineContainer');

	// 内容滚动同步到头部
	$timelineContent.on('scroll', function() {
		$timelineHeader.scrollLeft($(this).scrollLeft());
	});

	// 容器滚动同步
	$timelineContainer.on('scroll', function() {
		const scrollLeft = $(this).scrollLeft();
		$timelineHeader.scrollLeft(scrollLeft);
		$timelineContent.scrollLeft(scrollLeft);
	});

	// 头部滚动同步到内容
	$timelineHeader.on('scroll', function() {
		const scrollLeft = $(this).scrollLeft();
		$timelineContent.scrollLeft(scrollLeft);
		$timelineContainer.scrollLeft(scrollLeft);
	});
}

/**
 * 加载数据并刷新视图
 */
async function loadDataFromJson() {
	showToast(`正在加载【${currentShopName}】数据...`, 'info');
	await loadUserData();
	refreshTimeline();
	refreshOrderPlanTable();
	// 数据加载完成后初始化右键菜单和拖动功能
	initPlanContextMenu();
	initPlanDrag();
	showToast(`【${currentShopName}】数据加载完成，共${orderPlans.length}条计划`, 'success');
}

/**
 * 显示新增计划弹窗
 */
function showAddPlanModal() {
	$('#planForm')[0].reset();
	$('#editMode').val('add');
	$('#txtID').val('');
	$('#originalId').val('');
	$('#modalTitle').text(`新增计划（${currentShopName}）`);

	// 清空明细表格
	$('#detailTableBody').empty();
	addDetailRow();

	$('#editModal').modal('show');
}

/**
 * 显示编辑计划弹窗
 * @param {string|number} planId 计划ID
 */
function showEditPlanModal(planId) {
	const plan = orderPlans.find(p => p.ID == planId);
	if (!plan) {
		showToast('未找到该计划！', 'error');
		return;
	}

	// 填充表单数据
	$('#txtID').val(plan.ID);
	$('#originalId').val(plan.ID);
	$('#editMode').val('edit');
	$('#modalTitle').text(`编辑计划（${currentShopName}）`);
	$('#txtCode').val(plan.Code);
	$('#txtName').val(plan.Name);
	$('#txtSkuName').val(plan.SkuName);
	$('#txtSkuPrice').val(plan.SkuPrice);
	$('#txtCreateTime').val(formatDateTimeLocal(plan.createTime));

	// 填充明细数据
	$('#detailTableBody').empty();
	if (plan.ReleasePlans && Array.isArray(plan.ReleasePlans)) {
		plan.ReleasePlans.forEach(detail => addDetailRow(detail));
	} else {
		addDetailRow();
	}

	$('#editModal').modal('show');
}

/**
 * 添加明细行
 * @param {object} detail 明细数据
 */
function addDetailRow(detail = null) {
	const $tbody = $('#detailTableBody');
	const rowIndex = $tbody.find('tr').length;

	const releaseDate = detail ? formatDateOnly(detail.ReleaseDate) : '';
	const quantity = detail ? detail.ReleaseQuantity : '';
	const remark = detail ? detail.ReleaseName : '';

	const $tr = $(`
        <tr data-index="${rowIndex}">
            <td><input type="date" class="form-control detail-date" value="${releaseDate}" required></td>
            <td><input type="number" class="form-control detail-count" value="${quantity}" min="1" required></td>
            <td><input type="text" class="form-control detail-remark" value="${remark}"></td>
            <td><button type="button" class="btn btn-sm btn-danger btn-remove-detail">删除</button></td>
        </tr>
    `);

	$tbody.append($tr);

	// 绑定删除事件
	$('.btn-remove-detail').off('click').click(function() {
		$(this).closest('tr').remove();
	});
}

/**
 * 保存计划表单
 */
async function savePlanForm() {
	// 获取表单数据
	const editMode = $('#editMode').val();
	const planId = $('#originalId').val();
	const code = $('#txtCode').val().trim();
	const name = $('#txtName').val().trim();
	const skuname = $('#txtSkuName').val().trim();
	const skuprice = $('#txtSkuPrice').val().trim();
	const createTime = $('#txtCreateTime').val() ? new Date($('#txtCreateTime').val()) : new Date();

	if (!name) {
		showToast('车型名称不能为空！', 'error');
		return;
	}

	// 获取明细数据
	const details = [];
	let hasValidDetail = false;

	$('#detailTableBody tr').each(function() {
		const $tr = $(this);
		const date = $tr.find('.detail-date').val().trim();
		const quantity = $tr.find('.detail-count').val().trim();
		const remark = $tr.find('.detail-remark').val().trim();

		if (date && quantity) {
			details.push({
				ReleaseDate: new Date(date),
				ReleaseQuantity: parseInt(quantity),
				ReleaseName: remark
			});
			hasValidDetail = true;
		}
	});

	if (!hasValidDetail) {
		showToast('至少添加一条有效的放单明细！', 'error');
		return;
	}

	// 构造计划数据
	const planData = {
		ID: editMode === 'add' ? Date.now() : planId,
		Code: code,
		Name: name,
		SkuName: skuname,
		SkuPrice: skuprice,
		PostPictures: 0,
		createTime: createTime,
		ReleasePlans: details
	};

	// 更新数据
	if (editMode === 'add') {
		orderPlans.push(planData);
		showToast(`【${currentShopName}】计划新增成功`, 'success');
	} else {
		const index = orderPlans.findIndex(p => p.ID == planId);
		if (index !== -1) {
			orderPlans[index] = planData;
			showToast(`【${currentShopName}】计划编辑成功`, 'success');
		}
	}

	// 刷新视图并保存
	refreshTimeline();
	refreshOrderPlanTable();
	$('#editModal').modal('hide');
	await saveDataToJsonFile();
}

/**
 * 删除计划
 * @param {string|number} planId 计划ID
 */
async function deletePlan(planId) {
	if (!confirm('确定要删除该计划吗？此操作不可恢复！')) {
		return;
	}

	// 删除计划
	const beforeCount = orderPlans.length;
	orderPlans = orderPlans.filter(p => p.ID != planId);

	if (orderPlans.length < beforeCount) {
		// 刷新视图
		refreshTimeline();
		refreshOrderPlanTable();
		// 保存数据
		await saveDataToJsonFile();
		showToast(`【${currentShopName}】计划删除成功`, 'success');
	} else {
		showToast('删除失败，未找到该计划', 'error');
	}
}

/**
 * 通用的计划对比函数（支持不同日期范围）
 * @param {string} compareType 对比类型：todayTomorrow / yesterdayToday
 */
function showPlanCompareModal(compareType) {
	// 定义对比的两个日期
	let date1, date2, titleText;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (compareType === 'todayTomorrow') {
		// 今日/明日对比
		date1 = new Date(today); // 今日
		date2 = new Date(today);
		date2.setDate(date2.getDate() + 1); // 明日
		titleText = '今日/明日计划对比';
	} else if (compareType === 'yesterdayToday') {
		// 昨日/今日对比
		date1 = new Date(today);
		date1.setDate(date1.getDate() - 1); // 昨日
		date2 = new Date(today); // 今日
		titleText = '昨日/今日计划对比';
	} else {
		showToast('无效的对比类型', 'error');
		return;
	}

	// 更新弹窗标题
	$('#compareModalTitle').html(`<i class="fa fa-calendar"></i> ${titleText}`);

	// 整理对比数据（原有逻辑不变，仅替换日期变量）
	const date1Map = new Map();
	const date2Map = new Map();

	orderPlans.forEach(plan => {
		if (plan.ReleasePlans && Array.isArray(plan.ReleasePlans)) {
			plan.ReleasePlans.forEach(detail => {
				const detailDate = new Date(detail.ReleaseDate);
				detailDate.setHours(0, 0, 0, 0);

				const remark = detail.ReleaseName?.trim() || plan.Name || '未知计划';
				const planData = {
					Quantity: detail.ReleaseQuantity || 0,
					Remark: remark || '无',
					SkuName: plan.SkuName || '未指定',
					SkuPrice: plan.SkuPrice || '0'
				};

				if (detailDate.getTime() === date1.getTime()) {
					date1Map.set(plan.Name, planData);
				} else if (detailDate.getTime() === date2.getTime()) {
					date2Map.set(plan.Name, planData);
				}
			});
		}
	});

	// 分类整理对比结果（逻辑不变，仅替换变量名）
	const compareResult = {
		"新加单": [],
		"加单": [],
		"减单": [],
		"停单": [],
		"改放单词": []
	};

	// 遍历所有车型
	const allPlanNames = [...new Set([...date1Map.keys(), ...date2Map.keys()])];
	allPlanNames.forEach(name => {
		const date1Item = date1Map.get(name) || {
			Quantity: 0,
			Remark: '无',
			SkuName: '未指定',
			SkuPrice: '0'
		};
		const date2Item = date2Map.get(name) || {
			Quantity: 0,
			Remark: '无',
			SkuName: '未指定',
			SkuPrice: '0'
		};
		const isNewPlan = date1Item.Quantity === 0 && date2Item.Quantity > 0;

		// 分类判断
		if (isNewPlan) {
			const skuNamePart = date2Item.SkuName === '未指定' ?
				'' :
				` (${date2Item.SkuName})`;
			compareResult["新加单"].push(
				`${date2Item.Remark || name} * ${date2Item.Quantity}  ${date2Item.SkuPrice}*1${skuNamePart}`
			);
		} else if (date2Item.Quantity > date1Item.Quantity && date1Item.Quantity > 0) {
			const diff = date2Item.Quantity - date1Item.Quantity;
			compareResult["加单"].push(`${date1Item.Remark || name} 加${diff}单`);
		} else if (date2Item.Quantity < date1Item.Quantity && date2Item.Quantity > 0) {
			const diff = date1Item.Quantity - date2Item.Quantity;
			compareResult["减单"].push(`${date1Item.Remark || name} 减${diff}单`);
		} else if (date1Item.Quantity > 0 && date2Item.Quantity === 0) {
			compareResult["停单"].push(`${date1Item.Remark || name} 停单`);
		}

		// 改放单词判断
		if (!isNewPlan && date2Item.Quantity > 0 &&
			date1Item.Remark.trim() && date2Item.Remark.trim() &&
			date1Item.Remark !== date2Item.Remark) {
			compareResult["改放单词"].push(`${date1Item.Remark} → ${date2Item.Remark}`);
		}
	});

	// 生成对比文本（调整描述文字）
	let compareText = `${currentShopName} 私域单：\n`;
	Object.keys(compareResult).forEach(category => {
		if (compareResult[category].length > 0) {
			compareText += `【${category}】\n`;
			compareResult[category].forEach(item => {
				compareText += `${item}\n`;
			});
		}
	});

	// 兜底提示（根据对比类型调整文字）
	if (allPlanNames.length === 0) {
		const dateDesc = compareType === 'todayTomorrow' ? '今日和明日' : '昨日和今日';
		compareText += `→ ${currentShopName} ${dateDesc}均无放单计划\n`;
	} else if (Object.values(compareResult).every(arr => arr.length === 0)) {
		const dateDesc = compareType === 'todayTomorrow' ? '今日和明日' : '昨日和今日';
		compareText += `→ ${currentShopName} ${dateDesc}放单计划无任何变化\n`;
	}

	// 显示弹窗
	$('#compareResult').val(compareText);
	$('#compareModal').modal('show');
}

// 保留原有函数（兼容旧调用）
function showCompareModal() {
	showPlanCompareModal('todayTomorrow');
}

/**
 * 复制对比结果
 */
function copyCompareResult() {
	const $textarea = $('#compareResult');
	$textarea.select();

	try {
		document.execCommand('copy');
		showToast('对比结果已复制到剪贴板', 'success');
	} catch (err) {
		console.error('复制失败：', err);
		showToast('复制失败，请手动复制', 'error');
	}
}

/**
 * 新增：判断当前用户是否为有效会员
 * @returns {boolean} 是否为有效会员
 */
function isUserValidMember() {
	// 先校验基础登录状态
	if (!currentUserName || currentUserName.trim() === '') {
		return false;
	}

	// 优先从localStorage获取完整用户信息
	let userInfo = null;
	const userInfoStr = localStorage.getItem('currentUserInfo');
	if (userInfoStr) {
		try {
			userInfo = JSON.parse(userInfoStr);
		} catch (e) {
			console.error('解析用户信息失败：', e);
			userInfo = null;
		}
	}

	// localStorage获取失败，从USER_INFO_LIST获取
	if (!userInfo) {
		userInfo = USER_INFO_LIST.find(user => user.userName === currentUserName);
	}

	// 无用户信息直接返回false
	if (!userInfo) {
		return false;
	}

	// 检查用户会员身份
	if (userInfo.role === "normal") {
		return false; // 身份是普通用户
	}

	// 检查会员到期时间
	if (!userInfo.memberExpireTime) {
		return false; // 无会员到期时间视为非会员
	}

	// 验证日期有效性并判断是否过期
	return !isDateExpired(userInfo.memberExpireTime);
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
 * 切换视图
 * @param {string} viewType 视图类型：timeline/table
 */
function switchView(viewType) {
	const $timelineBtn = $('#btnShowTimeline');
	const $tableBtn = $('#btnShowTable');

	if (viewType === 'timeline') {
		// 显示时间轴视图
		$('#timelineContainerWrapper').show();
		$('#tableContainer').hide();

		$timelineBtn.removeClass('btn-default').addClass('btn-primary');
		$tableBtn.removeClass('btn-primary').addClass('btn-default');
	} else {
		// 显示表格视图
		$('#timelineContainerWrapper').hide();
		$('#tableContainer').show();

		$tableBtn.removeClass('btn-default').addClass('btn-primary');
		$timelineBtn.removeClass('btn-primary').addClass('btn-default');
	}
}

/**
 * 退出登录
 */
function logout() {
	if (confirm('确定要退出登录吗？')) {
		localStorage.removeItem('currentUserName');
		// 清除店铺选择记录
		localStorage.removeItem(`currentShop_${currentUserName}`);
		window.location.href = 'login.html';
	}
}

// ===================== 页面入口（核心修复） =====================
$(document).ready(async function() {
	// 验证登录状态
	currentUserName = localStorage.getItem('currentUserName');
	if (!currentUserName || currentUserName.trim() === '') {
		showToast('请先登录系统', 'warning');
		setTimeout(() => {
			window.location.href = 'login.html';
		}, 1500);
		return;
	}

	currentUserName = currentUserName.trim();
	$('#userNameDisplay').text(`登录用户：${currentUserName}`);

	// 核心修复：确保页面初始化是异步的，等待数据加载完成
	await initPage();
});

/**
 * 最终版：加载当前用户的充值记录
 * 加载失败时显示空数据，不展示mock示例
 * @returns {Promise} Promise对象
 */
async function loadRechargeRecords() {
	try {
		showToast(`正在加载【${currentUserName}】的充值记录...`, 'info');

		// 1. 从统一的充值记录文件读取所有数据
		const response = await fetch('/data/recharge-records.json', {
			cache: 'no-cache',
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error(`加载充值记录文件失败：${response.status}`);
		}

		// 2. 获取所有充值记录
		const allRechargeRecords = await response.json();

		// 3. 验证当前用户信息（确保有用户ID）
		if (!currentUserInfo || !currentUserInfo.id) {
			throw new Error('当前用户信息不完整，缺少用户ID');
		}

		// 4. 根据当前用户ID筛选对应的充值记录
		rechargeRecords = allRechargeRecords.filter(record =>
			record.userId === currentUserInfo.id
		);

		console.log(`[加载充值记录] 加载完成，共筛选出${rechargeRecords.length}条记录`, rechargeRecords);

		// 5. 无记录提示
		if (rechargeRecords.length === 0) {
			showToast(`【${currentUserName}】暂无充值记录`, 'info');
		}

		return rechargeRecords;
	} catch (error) {
		console.error('[加载充值记录] 失败：', error);

		// 关键修改：加载失败时清空数据，不设置mock数据
		rechargeRecords = [];

		// 仅提示加载失败，表格会显示"暂无充值记录"
		showToast('充值记录加载失败，请稍后重试', 'error');
		return rechargeRecords;
	}
}

/**
 * 最终版：渲染充值记录表格
 * 适配真实的recharge-records.json数据字段
 */
function renderRechargeRecordTable() {
	const $tbody = $('#rechargeRecordTableBody');
	$tbody.empty();

	if (rechargeRecords.length === 0) {
		$tbody.append(`<tr><td colspan="7" class="text-center">【${currentUserName}】暂无充值记录</td></tr>`);
		return;
	}

	// 按充值时间倒序排序
	const sortedRecords = [...rechargeRecords].sort((a, b) =>
		new Date(b.rechargeTime) - new Date(a.rechargeTime)
	);

	// 字段映射函数 - 格式化显示
	const formatPaymentMethod = (method) => {
		const methodMap = {
			'wechat': '微信支付',
			'alipay': '支付宝',
			'cash': '现金',
			'admin': '后台手动',
			'default': '未知方式'
		};
		return methodMap[method] || methodMap['default'];
	};

	const formatRechargeType = (type) => {
		const typeMap = {
			'normal': '普通充值',
			'renew': '续费',
			'upgrade': '升级',
			'default': '未知类型'
		};
		return typeMap[type] || typeMap['default'];
	};

	const formatPaymentStatus = (status) => {
		switch (status) {
			case 'success':
				return '<span class="recharge-status status-success">支付成功</span>';
			case 'fail':
				return '<span class="recharge-status status-failed">支付失败</span>';
			case 'pending':
				return '<span class="recharge-status status-pending">待支付</span>';
			default:
				return '<span class="recharge-status">未知状态</span>';
		}
	};

	// // 时间格式化函数（兼容ISO格式）
	// const formatIsoDate = (isoStr) => {
	// 	if (!isoStr) return '无';
	// 	try {
	// 		const date = new Date(isoStr);
	// 		return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
	// 	} catch (e) {
	// 		return isoStr;
	// 	}
	// };

	// 时间格式化函数（无时间）
	const formatDate = (isoStr) => {
		if (!isoStr) return '无';
		try {
			const date = new Date(isoStr);
			return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
		} catch (e) {
			return isoStr;
		}
	};

	// 时间格式化函数（紧凑版）
	const formatCompactDate = (isoStr) => {
		if (!isoStr) return '无';
		try {
			const date = new Date(isoStr);
			return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
		} catch (e) {
			return isoStr;
		}
	};

	// 完整时间格式化函数（用于Tooltip）
	const formatFullDate = (isoStr) => {
		if (!isoStr) return '无';
		try {
			const date = new Date(isoStr);
			return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
		} catch (e) {
			return isoStr;
		}
	};

	// sortedRecords.forEach(record => {
	// 	// const $tr = $(`
	// 	//           <tr>
	// 	//               <td>${record.rechargeId || 'N/A'}</td>
	// 	//               <td>¥${parseFloat(record.rechargeAmount).toFixed(2)}</td>
	// 	//               <td>${record.rechargeMonths} 个月</td>
	// 	//               <td>${formatRechargeType(record.rechargeType)}</td>
	// 	//               <td>${formatPaymentMethod(record.paymentMethod)}</td>
	// 	//               <td>${formatPaymentStatus(record.paymentStatus)}</td>
	// 	//               <td>${formatIsoDate(record.rechargeTime)}</td>
	// 	//               <td>${formatIsoDate(record.originalExpireTime)}</td>
	// 	//               <td>${formatIsoDate(record.newExpireTime)}</td>
	// 	//               <td>${record.operator || '无'}</td>
	// 	//               <td>${record.remark || '无'}</td>
	// 	//           </tr>
	// 	//       `);
	// 	const $tr = $(`
	//            <tr>
	//                <td>¥${parseFloat(record.rechargeAmount).toFixed(2)}</td>
	//                <td>${record.rechargeMonths} 个月</td>
	//                <td>${formatPaymentMethod(record.paymentMethod)}</td>
	//                <td>${formatPaymentStatus(record.paymentStatus)}</td>
	//                <td>${formatCompactDate(record.newExpireTime)}</td>
	//                <td>${record.remark || '无'}</td>
	//                <td>${formatCompactDate(record.rechargeTime)}</td>
	//            </tr>
	//        `);
	// 	$tbody.append($tr);
	// });

	sortedRecords.forEach(record => {
		// 准备每个单元格的显示文本和完整文本
		const cells = [{
				display: `¥${parseFloat(record.rechargeAmount).toFixed(2)}`,
				full: `¥${parseFloat(record.rechargeAmount).toFixed(2)}`
			},
			{
				display: `${record.rechargeMonths}个月`,
				full: `${record.rechargeMonths}个月`
			},
			{
				display: formatPaymentMethod(record.paymentMethod),
				full: formatPaymentMethod(record.paymentMethod)
			},
			{
				display: formatPaymentStatus(record.paymentStatus),
				full: record.paymentStatus === 'success' ? '支付成功' : record.paymentStatus === 'fail' ?
					'支付失败' : record.paymentStatus === 'pending' ? '待支付' : '未知状态'
			},
			{
				display: formatDate(record.newExpireTime),
				full: formatDate(record.newExpireTime)
			},
			{
				display: record.remark || '无',
				full: record.remark || '无'
			},
			{
				display: formatCompactDate(record.rechargeTime),
				full: formatFullDate(record.rechargeTime)
			}
		];

		// 构建表格行
		const $tr = $('<tr></tr>');
		cells.forEach(cell => {
			const $td = $(`<td data-full-text="${cell.full}">${cell.display}</td>`);
			$tr.append($td);
		});

		$tbody.append($tr);
	});

	// 绑定鼠标事件，显示Tooltip
	bindRechargeTableTooltip();
}

/**
 * 绑定充值记录表格的Tooltip事件
 */
function bindRechargeTableTooltip() {
	let tooltipTimeout;
	const $tooltip = $('<div class="recharge-tooltip"></div>');
	$('body').append($tooltip);

	$('.recharge-table td').on('mouseenter', function(e) {
		const $this = $(this);
		const fullText = $this.data('full-text');

		// 如果显示文本和完整文本相同，就不显示Tooltip
		if ($this.text().trim() === fullText.trim()) return;

		clearTimeout(tooltipTimeout);
		$tooltip.text(fullText);
		$tooltip.addClass('show');

		// 定位Tooltip在鼠标上方
		const offset = $this.offset();
		const tooltipWidth = $tooltip.outerWidth();
		const tooltipHeight = $tooltip.outerHeight();

		$tooltip.css({
			top: e.pageY - tooltipHeight - 10,
			left: e.pageX - (tooltipWidth / 2)
		});
	}).on('mouseleave', function() {
		tooltipTimeout = setTimeout(() => {
			$tooltip.removeClass('show');
		}, 100);
	});
}

/**
 * 新增：显示充值记录弹窗
 */
async function showRechargeRecordModal() {
	// 加载充值记录
	await loadRechargeRecords();
	// 渲染表格
	renderRechargeRecordTable();
	// 显示模态框
	$('#rechargeRecordModal').modal('show');
}

/**
 * 计算两个日期之间的天数差（包含起止日期）
 * @param {string} startDate 开始日期 YYYY-MM-DD
 * @param {string} endDate 结束日期 YYYY-MM-DD
 * @returns {number} 天数差
 */
function getDaysBetweenDates(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);

	// 验证日期有效性
	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		return -1;
	}

	// 确保只比较日期部分
	start.setHours(0, 0, 0, 0);
	end.setHours(0, 0, 0, 0);

	// 结束日期不能早于开始日期
	if (end < start) {
		return -2;
	}

	// 计算天数差
	const diffTime = end - start;
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包含起止日期
	return diffDays;
}

/**
 * 解析数量字符串为数字数组
 * @param {string} quantityStr 数量字符串（英文逗号分隔）
 * @returns {Array<number>} 数字数组，解析失败返回空数组
 */
function parseQuantityString(quantityStr) {
	if (!quantityStr || quantityStr.trim() === '') {
		return [];
	}

	// 按英文逗号分割并过滤空值
	const parts = quantityStr.replace(/，|、|\s+/g, ',').split(',').map(item => item.trim()).filter(item => item !== '');

	// 验证每个部分都是正整数
	const quantities = [];
	for (const part of parts) {
		const num = parseInt(part);
		if (isNaN(num) || num < 1) {
			return [];
		}
		quantities.push(num);
	}

	return quantities;
}

/**
 * 显示批量初始化弹窗
 */
function showBatchInitModal() {
	// 重置表单
	$('#batchInitForm')[0].reset();

	// 初始化默认天数下拉框（1-50）
	const $daysSelect = $('#defaultInitDays');
	$daysSelect.empty();
	$daysSelect.append('<option value="">请选择初始化天数</option>');
	for (let i = 1; i <= 50; i++) {
		$daysSelect.append(`<option value="${i}">${i}天</option>`);
	}

	// 默认选中今天作为开始日期
	const today = new Date();
	const todayStr = formatDateOnly(today);
	$('#batchStartDate').val(todayStr);

	// 默认选中明天作为结束日期
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	$('#batchEndDate').val(formatDateOnly(tomorrow));

	$('#batchInitModal').modal('show');
}

/**
 * 执行批量初始化明细
 */
function executeBatchInit() {
	// 获取表单数据
	const startDate = $('#batchStartDate').val().trim();
	const endDate = $('#batchEndDate').val().trim();
	const quantityStr = $('#batchQuantities').val().trim();
	const singleQuantity = $('#singleQuantity').val().trim();
	const defaultDays = $('#defaultInitDays').val();

	// 基础验证
	if (!defaultDays) {
		showToast('请选择默认初始化天数', 'error');
		return;
	}

	if (!startDate || !endDate) {
		showToast('请选择完整的日期范围', 'error');
		return;
	}

	// 处理数量逻辑：优先使用自动生成的数量，没有则使用手动输入的
	let quantities = [];
	if (singleQuantity && singleQuantity > 0) {
		// 使用单日数量自动生成
		const days = parseInt(defaultDays);
		quantities = Array(days).fill(parseInt(singleQuantity));
	} else if (quantityStr) {
		// 解析手动输入的数量
		quantities = parseQuantityString(quantityStr);
		if (quantities.length === 0) {
			showToast('放单数量格式错误，请输入正整数，使用英文逗号分隔', 'error');
			return;
		}
	} else {
		showToast('请输入单日放单数量', 'error');
		return;
	}

	// 计算日期天数
	const daysCount = getDaysBetweenDates(startDate, endDate);
	if (daysCount === -1) {
		showToast('日期格式无效，请选择有效的日期', 'error');
		return;
	}
	if (daysCount === -2) {
		showToast('结束日期不能早于开始日期', 'error');
		return;
	}

	// 验证数量个数与天数匹配
	if (quantities.length !== daysCount) {
		showToast(`数量个数(${quantities.length})与日期天数(${daysCount})不匹配，请重新输入`, 'error');
		return;
	}

	// 清空原有明细
	$('#detailTableBody').empty();

	// 批量生成明细行
	const currentDate = new Date(startDate);
	for (let i = 0; i < daysCount; i++) {
		const detail = {
			ReleaseDate: new Date(currentDate),
			ReleaseQuantity: quantities[i],
			ReleaseName: ''
		};
		addDetailRow(detail);

		// 日期加1天
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// 关闭模态框并提示
	$('#batchInitModal').modal('hide');
	showToast(`成功初始化${daysCount}天的放单明细`, 'success');
}