import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import USER_ROLE from '../utils/USER_ROLE';

function HEADER_MENU() {
  const userRoles = useSelector((state) => state.appStore.userInfo.userRoles);
  const { t } = useTranslation();
  const MENU = [
    {
      main: {
        title: t('vehicle.menu'),
        icon: <i className="bi bi-ev-front"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.VehicleParking),
        // isVisible: true,
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('vehicle.submenu.vehicle_page.title'),
            icon: <i className="bi bi-ev-front"></i>,
            route: 'vehicle',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
    {
      main: {
        title: t('card.menu'),
        icon: <i className="bi bi-postcard"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.CardParking),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('card.menu'),
            icon: <i className="bi bi-postcard"></i>,
            route: 'card',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
    {
      main: {
        title: t('employee.menu'),
        icon: <i className="bi bi-people"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.CustomerParking),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('employee.submenu.employee_page.title'),
            icon: <i className="bi bi-people"></i>,
            route: 'employee',
            style: { color: 'var(--text-color)' },
            child: [
              {
                title: 'Registered customer list',
                icon: <i className="bi bi-people"></i>,
                route: 'employee',
                style: { color: 'var(--text-color)' },
                child: [],
              },
              {
                title: 'Overdue list',
                icon: <i className="bi bi-people"></i>,
                route: 'employee',
                style: { color: 'var(--text-color)' },
                child: [],
              },
            ],
          },
          {
            title: t('employee.submenu.employee_account_page.title'),
            icon: <i className="bi bi-people"></i>,
            route: '#',
            style: { color: 'var(--text-color)' },
            child: [
              {
                title: 'Registered customer list',
                icon: <i className="bi bi-people"></i>,
                route: 'list-subscriber-registration',
                style: { color: 'var(--text-color)' },
                child: [],
              },
              {
                title: 'Overdue list',
                icon: <i className="bi bi-people"></i>,
                route: 'list-subscriber-overdue',
                style: { color: 'var(--text-color)' },
                child: [],
              },
            ],
          },
        ],
      },
    },
    {
      main: {
        title: t('statistic.menu'),
        icon: <i className="bi bi-bar-chart"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.StatisticSystem),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('statistic.menu'),
            icon: <i className="bi bi-bar-chart"></i>,
            route: 'statistic',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
    {
      main: {
        title: t('role.menu'),
        icon: <i className="bi bi-arrow-repeat"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.RoleSystem),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('role.menu'),
            icon: <i className="bi bi-arrow-repeat"></i>,
            route: 'userrole',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
    // {
    //   main: {
    //     title: t('config.menu'),
    //     icon: <i className="bi bi-sliders"></i>,
    //     route: '#',
    //     style: { color: 'var(--text-color)' },
    //     child: [
    //       {
    //         title: t('config.menu'),
    //         icon: <i className="bi bi-sliders"></i>,
    //         route: 'config',
    //         style: { color: 'var(--text-color)' },
    //         child: [
    //           {
    //             title: t('config.settings.system.title'),
    //             icon: <i className="bi bi-gear"></i>,
    //             route: 'system-setting',
    //             style: { color: 'var(--text-color)' },
    //             child: [],
    //           },
    //           {
    //             title: t('vehicle.menu'),
    //             icon: <i className="bi bi-ev-front"></i>,
    //             route: 'vehicle',
    //             style: { color: 'var(--text-color)' },
    //             child: [],
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // },
    {
      main: {
        title: t('config.menu'),
        icon: <i className="bi bi-sliders"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.Settings),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('config.settings.system.title'),
            icon: <i className="bi bi-gear"></i>,
            route: 'system-setting',
            style: { color: 'var(--text-color)' },
            child: [],
          },
          {
            title: t('config.settings.manage_access.title'),
            icon: <i className="bi bi-filetype-key"></i>,
            route: 'manage-access',
            style: { color: 'var(--text-color)' },
            child: [],
          },
          {
            title: t('config.settings.permissions_mobile_app.title'),
            icon: <i className="bi bi-phone-flip"></i>,
            route: 'permissions-mobile-app',
            style: { color: 'var(--text-color)' },
            child: [],
          },
          {
            title: 'Invoice configuration',
            icon: <i className="bi bi-receipt"></i>,
            route: 'digital-invoice-config',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
    {
      main: {
        title: t('histories.menu'),
        icon: <i className="bi bi-clock-history"></i>,
        route: '#',
        isVisible: userRoles.includes(USER_ROLE.HistoryInOutParking),
        style: { color: 'var(--text-color)' },
        child: [
          {
            title: t('histories.card_history.page_title'),
            icon: <i className="bi bi-card-text"></i>,
            route: 'history-card',
            style: { color: 'var(--text-color)' },
            child: [],
          },
          {
            title: t('histories.card_master_history.page_title'),
            icon: <i className="bi bi-credit-card"></i>,
            route: 'history-card-master',
            style: { color: 'var(--text-color)' },
            child: [],
          },
          {
            title: t('histories.access_event.page_title'),
            icon: <i className="bi bi-calendar2-event"></i>,
            route: 'access-event',
            style: { color: 'var(--text-color)' },
            child: [],
          },
        ],
      },
    },
  ];

  return MENU;
}

export default HEADER_MENU;
