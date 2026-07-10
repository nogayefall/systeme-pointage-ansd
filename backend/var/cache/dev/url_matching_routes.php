<?php

/**
 * This file has been auto-generated
 * by the Symfony Routing Component.
 */

return [
    false, // $matchHost
    [ // $staticRoutes
        '/_wdt/styles' => [[['_route' => '_wdt_stylesheet', '_controller' => 'web_profiler.controller.profiler::toolbarStylesheetAction'], null, null, null, false, false, null]],
        '/_profiler' => [[['_route' => '_profiler_home', '_controller' => 'web_profiler.controller.profiler::homeAction'], null, null, null, true, false, null]],
        '/_profiler/search' => [[['_route' => '_profiler_search', '_controller' => 'web_profiler.controller.profiler::searchAction'], null, null, null, false, false, null]],
        '/_profiler/search_bar' => [[['_route' => '_profiler_search_bar', '_controller' => 'web_profiler.controller.profiler::searchBarAction'], null, null, null, false, false, null]],
        '/_profiler/phpinfo' => [[['_route' => '_profiler_phpinfo', '_controller' => 'web_profiler.controller.profiler::phpinfoAction'], null, null, null, false, false, null]],
        '/_profiler/xdebug' => [[['_route' => '_profiler_xdebug', '_controller' => 'web_profiler.controller.profiler::xdebugAction'], null, null, null, false, false, null]],
        '/_profiler/open' => [[['_route' => '_profiler_open_file', '_controller' => 'web_profiler.controller.profiler::openAction'], null, null, null, false, false, null]],
        '/api/auth/login' => [[['_route' => 'api_auth_login', '_controller' => 'App\\Controller\\Api\\AuthController::login'], null, ['POST' => 0], null, false, false, null]],
        '/api/auth/me' => [[['_route' => 'api_auth_me', '_controller' => 'App\\Controller\\Api\\AuthController::me'], null, ['GET' => 0], null, false, false, null]],
        '/api/auth/logout' => [[['_route' => 'api_auth_logout', '_controller' => 'App\\Controller\\Api\\AuthController::logout'], null, ['POST' => 0], null, false, false, null]],
        '/api/badge-codes' => [
            [['_route' => 'api_badge_codes_list', '_controller' => 'App\\Controller\\Api\\BadgeCodeController::list'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'api_badge_codes_create', '_controller' => 'App\\Controller\\Api\\BadgeCodeController::create'], null, ['POST' => 0], null, false, false, null],
        ],
        '/api/leaves' => [
            [['_route' => 'api_leaves_create', '_controller' => 'App\\Controller\\Api\\LeaveRequestController::create'], null, ['POST' => 0], null, false, false, null],
            [['_route' => 'api_leaves_list', '_controller' => 'App\\Controller\\Api\\LeaveRequestController::list'], null, ['GET' => 0], null, false, false, null],
        ],
        '/api/reports/pointages' => [[['_route' => 'api_reports_list_pointages', '_controller' => 'App\\Controller\\Api\\ReportController::listPointages'], null, ['GET' => 0], null, false, false, null]],
        '/api/reports/attendance' => [[['_route' => 'api_reports_attendance', '_controller' => 'App\\Controller\\Api\\ReportController::attendance'], null, ['GET' => 0], null, false, false, null]],
        '/api/reports/anomalies' => [[['_route' => 'api_reports_anomalies', '_controller' => 'App\\Controller\\Api\\ReportController::anomalies'], null, ['GET' => 0], null, false, false, null]],
        '/api/statistics/summary' => [[['_route' => 'api_statistics_summary', '_controller' => 'App\\Controller\\Api\\StatisticsController::summary'], null, ['GET' => 0], null, false, false, null]],
        '/api/statistics/hourly-distribution' => [[['_route' => 'api_statistics_hourly_distribution', '_controller' => 'App\\Controller\\Api\\StatisticsController::hourlyDistribution'], null, ['GET' => 0], null, false, false, null]],
        '/api/statistics/daily-trend' => [[['_route' => 'api_statistics_daily_trend', '_controller' => 'App\\Controller\\Api\\StatisticsController::dailyTrend'], null, ['GET' => 0], null, false, false, null]],
        '/api/statistics/agent-attendance' => [[['_route' => 'api_statistics_agent_attendance', '_controller' => 'App\\Controller\\Api\\StatisticsController::agentAttendance'], null, ['GET' => 0], null, false, false, null]],
        '/api/users' => [
            [['_route' => 'api_users_list', '_controller' => 'App\\Controller\\Api\\UserController::list'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'api_users_create', '_controller' => 'App\\Controller\\Api\\UserController::create'], null, ['POST' => 0], null, false, false, null],
        ],
        '/api/users/agents' => [[['_route' => 'api_users_agents', '_controller' => 'App\\Controller\\Api\\UserController::agents'], null, ['GET' => 0], null, false, false, null]],
        '/api/permissions' => [
            [['_route' => 'api_permissions_list', '_controller' => 'App\\Controller\\PermissionController::list'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'api_permissions_create', '_controller' => 'App\\Controller\\PermissionController::create'], null, ['POST' => 0], null, false, false, null],
        ],
        '/api/pointages' => [
            [['_route' => 'api_pointages_list', '_controller' => 'App\\Controller\\PointageController::list'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'api_pointages_create', '_controller' => 'App\\Controller\\PointageController::create'], null, ['POST' => 0], null, false, false, null],
        ],
        '/api/pointages/today' => [[['_route' => 'api_pointages_today', '_controller' => 'App\\Controller\\PointageController::today'], null, ['GET' => 0], null, false, false, null]],
        '/api/pointages/agents' => [[['_route' => 'api_pointages_list_agents', '_controller' => 'App\\Controller\\PointageController::listAgents'], null, ['GET' => 0], null, false, false, null]],
        '/api/pointages/my' => [[['_route' => 'api_pointages_my_pointages', '_controller' => 'App\\Controller\\PointageController::myPointages'], null, ['GET' => 0], null, false, false, null]],
        '/api/roles' => [
            [['_route' => 'api_roles_list', '_controller' => 'App\\Controller\\RoleController::list'], null, ['GET' => 0], null, false, false, null],
            [['_route' => 'api_roles_create', '_controller' => 'App\\Controller\\RoleController::create'], null, ['POST' => 0], null, false, false, null],
        ],
    ],
    [ // $regexpList
        0 => '{^(?'
                .'|/_(?'
                    .'|error/(\\d+)(?:\\.([^/]++))?(*:38)'
                    .'|wdt/([^/]++)(*:57)'
                    .'|profiler/(?'
                        .'|font/([^/\\.]++)\\.woff2(*:98)'
                        .'|([^/]++)(?'
                            .'|/(?'
                                .'|search/results(*:134)'
                                .'|router(*:148)'
                                .'|exception(?'
                                    .'|(*:168)'
                                    .'|\\.css(*:181)'
                                .')'
                            .')'
                            .'|(*:191)'
                        .')'
                    .')'
                .')'
                .'|/api/(?'
                    .'|badge\\-codes/([^/]++)(*:231)'
                    .'|leaves/([^/]++)/(?'
                        .'|approve(*:265)'
                        .'|reject(*:279)'
                    .')'
                    .'|users/([^/]++)(?'
                        .'|(*:305)'
                    .')'
                    .'|p(?'
                        .'|ermissions/([^/]++)(?'
                            .'|(*:340)'
                        .')'
                        .'|ointages/(?'
                            .'|check/([^/]++)(*:375)'
                            .'|([^/]++)(*:391)'
                        .')'
                    .')'
                    .'|roles/([^/]++)(?'
                        .'|(*:418)'
                        .'|/permissions(*:438)'
                    .')'
                .')'
            .')/?$}sDu',
    ],
    [ // $dynamicRoutes
        38 => [[['_route' => '_preview_error', '_controller' => 'error_controller::preview', '_format' => 'html'], ['code', '_format'], null, null, false, true, null]],
        57 => [[['_route' => '_wdt', '_controller' => 'web_profiler.controller.profiler::toolbarAction'], ['token'], null, null, false, true, null]],
        98 => [[['_route' => '_profiler_font', '_controller' => 'web_profiler.controller.profiler::fontAction'], ['fontName'], null, null, false, false, null]],
        134 => [[['_route' => '_profiler_search_results', '_controller' => 'web_profiler.controller.profiler::searchResultsAction'], ['token'], null, null, false, false, null]],
        148 => [[['_route' => '_profiler_router', '_controller' => 'web_profiler.controller.router::panelAction'], ['token'], null, null, false, false, null]],
        168 => [[['_route' => '_profiler_exception', '_controller' => 'web_profiler.controller.exception_panel::body'], ['token'], null, null, false, false, null]],
        181 => [[['_route' => '_profiler_exception_css', '_controller' => 'web_profiler.controller.exception_panel::stylesheet'], ['token'], null, null, false, false, null]],
        191 => [[['_route' => '_profiler', '_controller' => 'web_profiler.controller.profiler::panelAction'], ['token'], null, null, false, true, null]],
        231 => [[['_route' => 'api_badge_codes_delete', '_controller' => 'App\\Controller\\Api\\BadgeCodeController::delete'], ['id'], ['DELETE' => 0], null, false, true, null]],
        265 => [[['_route' => 'api_leaves_approve', '_controller' => 'App\\Controller\\Api\\LeaveRequestController::approve'], ['id'], ['POST' => 0], null, false, false, null]],
        279 => [[['_route' => 'api_leaves_reject', '_controller' => 'App\\Controller\\Api\\LeaveRequestController::reject'], ['id'], ['POST' => 0], null, false, false, null]],
        305 => [
            [['_route' => 'api_users_update', '_controller' => 'App\\Controller\\Api\\UserController::update'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'api_users_delete', '_controller' => 'App\\Controller\\Api\\UserController::delete'], ['id'], ['DELETE' => 0], null, false, true, null],
        ],
        340 => [
            [['_route' => 'api_permissions_update', '_controller' => 'App\\Controller\\PermissionController::update'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'api_permissions_delete', '_controller' => 'App\\Controller\\PermissionController::delete'], ['id'], ['DELETE' => 0], null, false, true, null],
        ],
        375 => [[['_route' => 'api_pointages_check_agent', '_controller' => 'App\\Controller\\PointageController::checkAgent'], ['matricule'], ['GET' => 0], null, false, true, null]],
        391 => [[['_route' => 'api_pointages_delete', '_controller' => 'App\\Controller\\PointageController::delete'], ['id'], ['DELETE' => 0], null, false, true, null]],
        418 => [
            [['_route' => 'api_roles_show', '_controller' => 'App\\Controller\\RoleController::show'], ['id'], ['GET' => 0], null, false, true, null],
            [['_route' => 'api_roles_update', '_controller' => 'App\\Controller\\RoleController::update'], ['id'], ['PUT' => 0], null, false, true, null],
            [['_route' => 'api_roles_delete', '_controller' => 'App\\Controller\\RoleController::delete'], ['id'], ['DELETE' => 0], null, false, true, null],
        ],
        438 => [
            [['_route' => 'api_roles_update_permissions', '_controller' => 'App\\Controller\\RoleController::updatePermissions'], ['id'], ['PUT' => 0], null, false, false, null],
            [null, null, null, null, false, false, 0],
        ],
    ],
    null, // $checkCondition
];
