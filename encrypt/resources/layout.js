$(function () {
    var _headerNavMenu = $('#headerNavMenu');
    // PC 导航栏 Dropdown
    _headerNavMenu.find('.dropdown').dropdown();

    // osc小程序
    $('#btnDownloadApp').popup({
        position : 'right center',
        popup    : $('#btnDownloadAppContent')
    });
    $('.btnDownloadTop').popup({
        position : 'left center',
        popup    : $('.btnDownloadTopContent')
    });
    $('.btnDownloadBottom').popup({
        position : 'left center',
        popup    : $('.btnDownloadBottomContent')
    });

    // 开源观止菜单
    $('body').on('click', '.pdfTab',function (e) {
        e.stopPropagation();
        let ele = $(this).find('.pdfMenu')
        if(ele.is(':hidden')){
            $('.pdfMenu').hide();
            $(this).find('.pdfMenu').show()
        }else {
            $('.pdfMenu').hide();
            $(this).find('.pdfMenu').hide()
        }
    })
    $('body').on('click',function () {
        $(this).find('.pdfMenu').hide()
    })

    // 移动端展开左侧导航 Sidebar 菜单
    var mobileNavSidebar = $('#mobileNavSidebar');
    mobileNavSidebar.sidebar({
        dimPage: true,
        transition: 'overlay',
        mobileTransition: 'overlay',
        useLegacy: false,
        exclusive: true
    });
    mobileNavSidebar.sidebar('attach events', '.toggle-mobile-nav-sidebar');
    // $('.toggle-mobile-nav-sidebar').on('click', function (e) {
    //     mobileNavSidebar.sidebar('toggle');
    //     e.preventDefault();
    // });
    // 移动端展开右侧用户 Sidebar 菜单
    var mobileUserSidebar = $('#mobileUserSidebar');
    mobileUserSidebar.sidebar({
        dimPage: true,
        transition: 'overlay',
        mobileTransition: 'overlay',
        useLegacy: false,
        exclusive: true
    });
    mobileUserSidebar.sidebar('attach events', '.toggle-mobile-user-sidebar');
    // $('.toggle-mobile-user-sidebar').on('click', function (e) {
    //     mobileUserSidebar.sidebar('toggle');
    //     e.preventDefault();
    // });
    // PC端展开右侧用户 Sidebar 菜单
    var userSidebar = $('#userSidebar');
    userSidebar.sidebar({
        dimPage: true,
        transition: 'uncover',
        useLegacy: 'auto',
        duration: 500,
        exclusive: true
    });
    $('.toggle-user-sidebar').on('click', function (e) {
        userSidebar.sidebar('toggle');
        e.preventDefault();
    });

    // 监听所有锚点链接 实现平滑滚动动画
    $(document).on('click', 'a[href*="#"]:not([href="#"]), area[href*="#"]', function (e) {
        if (location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') &&
            location.hostname === this.hostname) {
            let $target = $(this.hash);
            $target = $target.length && $target || $('[name="' + this.hash.slice(1) + '"]');
            if ($target.length) {
                e.preventDefault();
                let targetOffset = $target.offset().top;
                const customOffset = parseInt($target.data('offset')) || 0;
                // 优化用户体验, 上移 82px
                if (targetOffset - 82 > 0) {
                    targetOffset = targetOffset - 82;
                }
                if (!isNaN(customOffset)) {
                    targetOffset = targetOffset + customOffset;
                }
                $('html, body').stop(true).animate({scrollTop: targetOffset}, 400, 'swing');
            }
        }
    });

    // 退出登录按钮
    $(document).on('click', '.logout-btn', function () {
        $.post(page.api_prefix + '/user/logout', {
            session: page.g_user_code
        }, function (res) {
            if (res.code === 200) {
                $('body').toast({type: 'success', content: '退出成功'});
                setTimeout(function () {
                    // 重新加载页面
                    location.reload();
                }, 0);
            } else {
                $('body').toast({type: 'error', content: res.message || '退出失败，请稍后再试'});
            }
        }).fail(function () {
            // 失败处理
            $('body').toast({type: 'error', content: '网络错误，请稍后再试'});
        });
    });

    // 绑定 搜索框按钮点击事件
    _headerNavMenu.on('click', '.search-item .search.link.icon', function () {
        var searchForm = $(this).parents('.search-item:eq(0)');
        var q = searchForm.find('input[name=q]').val().trim();
        // 无关键词时不响应
        if (q.length > 0) {
            searchForm.submit();
        }
    });

    // 进入页面后自动滚动到锚点位置(刷新页面不处理)
    if (!window.name) {
        var hash = location.hash || '';
        if (hash.match(/^#[\w\d-_]+$/g)) {
            var $target = $(hash);
            $target = $target.length && $target || $('[name="' + location.hash.slice(1) + '"]');
            if ($target.length) {
                var targetOffset = $target.offset().top;
                var customOffset = parseInt($target.data('offset')) || 0;
                // 优化用户体验, 上移 80px
                if (targetOffset - 80 > 0) {
                    targetOffset = targetOffset - 80;
                }
                if (!isNaN(customOffset)) {
                    targetOffset = targetOffset + customOffset;
                }
                $('html, body').stop(true).animate({scrollTop: targetOffset}, 500, 'swing');
                // 标记下一次为非新进入
                window.name = 'opened'
            }
        }
    }


    // 分享菜单
    function shareMenu() {
        // 分享下拉菜单 (仅做 dropdown !!)
        $('.dropdown-share').dropdown({
            action: 'hide',
            /*
            onChange: function (shareType) {
                // console.log('[shareMenu] dropdown', shareType);
                // 记录详情分享统计 -- 已经移动到 osc-share.js
            }
            */
        });

        // 左侧浮动分享菜单
        /*
        $('.menu-share').on('click', '.item[data-value]', function () {
            var shareItem = $(this);
            var shareType = shareItem.data('value');
            // console.log('[shareMenu] left menu', shareType);
            // 记录详情分享统计 -- 已经移动到 osc-share.js
        });
        */
    }
    shareMenu();


    // 新版一级导航栏(小)滚动到二级导航栏下方时自动显示LOGO/搜索框
    function initSmallHeaderBox() {
        // 一级导航(小)
        const smallHeaderBoxEl = $('.small-header-box');
        if (!smallHeaderBoxEl || smallHeaderBoxEl.length <= 0) {
            return false;
        }

        // 没有固定则不需要启用
        if (!smallHeaderBoxEl.is('.small-header-box--fixed')) {
            return false;
        }

        // 二级导航
        const secondaryHeaderBoxEl = $('.secondary-header-box');
        // 判断是否启用了二级导航
        if (!(page.secondaryHeaderEnable && secondaryHeaderBoxEl && secondaryHeaderBoxEl.length > 0)) {
            return false;
        }

        // 一级导航(小)位置信息
        const smallHeaderBoxHeight = smallHeaderBoxEl.outerHeight();

        // 二级导航栏位置信息
        const secondaryHeaderBoxRect = window.common.getElementOffset(secondaryHeaderBoxEl[0]);
        const secondaryHeaderBoxRectTop = secondaryHeaderBoxRect && secondaryHeaderBoxRect.top || 0;
        const secondaryHeaderBoxHeight = secondaryHeaderBoxEl.outerHeight();
        const secondaryHeaderBoxRectBottom = secondaryHeaderBoxRectTop + secondaryHeaderBoxHeight;

        // 计算是否显示完整版的滚动条偏移量
        const checkOffset = secondaryHeaderBoxRectBottom - smallHeaderBoxHeight;
        if (checkOffset <= 0) {
            return false;
        }

        // 将一级导航栏中的导航链接 从简洁版复制到完整版
        /*
        const mainBarRowSimpleEl = smallHeaderBoxEl.find('.main-bar__row--simple');
        const mainBarRowSimpleNavBarEl = mainBarRowSimpleEl.find('.nav-bar');
        const mainBarRowFullEl = smallHeaderBoxEl.find('.main-bar__row--full');
        mainBarRowFullEl.append(mainBarRowSimpleNavBarEl.clone());
        */

        // 滚动条事件
        function handleScroll() {
            const pageYOffset = window.pageYOffset || document.documentElement.scrollTop;

            if (pageYOffset >= checkOffset) {
                // 显示完整版
                if (!smallHeaderBoxEl.hasClass('small-header-box--switch-full')) {
                    smallHeaderBoxEl.addClass('small-header-box--switch-full');
                }
            } else {
                // 不显示完整版
                if (smallHeaderBoxEl.hasClass('small-header-box--switch-full')) {
                    smallHeaderBoxEl.removeClass('small-header-box--switch-full');
                }
            }
        }
        // 立即执行一次
        handleScroll();

        // 绑定滚动条事件
        const handleScrollWithThrottle = window.common.throttle(handleScroll, 20);
        $(window).on('scroll', handleScrollWithThrottle);
    }
    initSmallHeaderBox();

    // 新版导航栏[一级导航栏(大/小)] - 导航栏"专区"显示[new]标识
    function initHeaderBoxNavBarGroupLabel() {
        const cookieName = 'OSC_NAV_BAR_GROUP_NEW_LABEL_DISABLED';
        const disabledNewLabel = window.common.getCookie(cookieName);
        if (disabledNewLabel) {
            return false;
        }

        // 一级导航(小)
        const smallHeaderBoxEl = $('.small-header-box');
        const smallNavBar = smallHeaderBoxEl.find('.nav-bar');

        // 一级导航(大)
        const headerBoxEl = $('.header-box');
        const navBar = headerBoxEl.find('.nav-bar');

        // 移除标签
        function removeNewLabel() {
            smallNavBar.find('.tabs-item--new').removeClass('tabs-item--new-show');
            navBar.find('.tabs-item--new').removeClass('tabs-item--new-show');
        }

        // 显示标签
        function showNewLabel() {
            smallNavBar.find('.tabs-item--new').addClass('tabs-item--new-show');
            navBar.find('.tabs-item--new').addClass('tabs-item--new-show');
        }

        // 点击事件
        function onClickNewLabelTab() {
            window.common.setCookie(cookieName, 'true', 3650);
            removeNewLabel();
        }

        // 导航栏"专区"显示[new]标识
        showNewLabel();

        // 绑定点击事件
        smallHeaderBoxEl.on('click', '.nav-bar > .nav-bar__tabs > .tabs-item.tabs-item--new', onClickNewLabelTab);
        headerBoxEl.on('click', '.nav-bar > .nav-bar__tabs > .tabs-item.tabs-item--new', onClickNewLabelTab);
    }
    // initHeaderBoxNavBarGroupLabel();
});