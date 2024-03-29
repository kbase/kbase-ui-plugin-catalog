define([
    'jquery',
    'bluebird',
    'kb_service/client/narrativeMethodStore',
    'kb_service/client/catalog',
    'kb_common/jsonRpc/genericClient',
    'kbaseUI/utils',
    '../catalog_util',
    '../app_card',
    'yaml!../data/categories.yml',

    // for effect
    'kbaseUI/widget/legacy/authenticatedWidget',
    'bootstrap'
], ($, Promise, NarrativeMethodStore, Catalog, GenericClient, utils, CatalogUtil, AppCard, categoriesConfig) => {
    $.KBWidget({
        name: 'KBaseCatalogBrowser',
        parent: 'kbaseAuthenticatedWidget', // todo: do we still need th
        options: {
            tag: null
        },
        $errorPanel: null,

        // clients to the catalog service and the NarrativeMethodStore
        catalog: null,
        nms: null,
        catalogClient: null,
        nmsClient: null,

        // list of NMS method and app info (todo: we need to move this to the catalog)
        // for now, most of the filtering/sorting etc is done on the front end; this
        // will eventually need to move to backend servers when there are enough methods
        appList: null,
        appLookup: null,

        // list of catalog module info
        moduleList: null,

        // dict of module info for fast lookup
        moduleLookup: null,

        favoritesList: null,

        // control panel and elements
        $controlToolbar: null,
        $searchBox: null,

        // main panel and elements
        $mainPanel: null,
        $appListPanel: null,
        $moduleListPanel: null,
        $loadingPanel: null,

        categories: {},

        init: function (options) {
            this._super(options);

            this.categories = categoriesConfig.categories;

            // new style we have a runtime object that gives us everything in the options
            this.runtime = options.runtime;
            this.isLoggedIn = this.runtime.service('session').isLoggedIn();
            this.util = new CatalogUtil();
            this.setupClients();

            // process the 'tag' argument, which can only be dev | beta | release
            this.showReleaseTagLabels = true;
            if (this.options.tag) {
                this.options.tag = this.options.tag.toLowerCase();
                if (this.options.tag !== 'dev' && this.options.tag !== 'beta' && this.options.tag !== 'release') {
                    console.warn(
                        'tag ' + this.options.tag + ' is not valid! Use: dev/beta/release.  defaulting to release.'
                    );
                    this.options.tag = 'release';
                }
            } else {
                this.options.tag = 'release';
            }
            if (this.options.tag === 'release') {
                this.showReleaseTagLabels = false;
            }

            // initialize and add the control bar
            var $container = $('<div>').addClass('container-fluid');
            this.$elem.append($container);
            var ctrElements = this.renderControlToolbar();
            this.$controlToolbar = ctrElements[0];
            this.$searchBox = ctrElements[1];
            $container.append(this.$controlToolbar);

            // initialize and add the main panel
            this.$loadingPanel = this.util.initLoadingPanel();
            this.$elem.append(this.$loadingPanel);
            var mainPanelElements = this.initMainPanel();
            this.$mainPanel = mainPanelElements[0];
            this.$appListPanel = mainPanelElements[1];
            this.$moduleListPanel = mainPanelElements[2];
            $container.append(this.$mainPanel);
            this.showLoading();

            // get the list of apps and modules
            var loadingCalls = [];
            this.appList = [];
            this.moduleList = [];
            loadingCalls.push(this.populateAppList(this.options.tag));
            loadingCalls.push(this.populateModuleList(this.options.tag));
            loadingCalls.push(this.isDeveloper());
            // only show legacy apps if we are showing everything
            this.legacyApps = [];
            if (this.options.tag === 'release') {
                loadingCalls.push(this.populateAppListWithLegacyApps());
            }

            // when we have it all, then render the list
            Promise.all(loadingCalls).then(() => {
                this.processData();

                this.updateFavoritesCounts()
                    .then(() => {
                        this.hideLoading();
                        //this.renderAppList('favorites');
                        // Instead of making the default sort by # of favorites, sort by category (more intuitive to users)
                        // This has the effect of sorting by favorites and
                        // grouping by category.
                        this.sortBy('favorites');
                        this.renderAppList('category');
                        return Promise.all([this.updateRunStats(), this.updateMyFavorites()]);
                    })
                    .catch((err) => {
                        console.error('ERROR');
                        console.error(err);
                        this.hideLoading();
                        this.renderAppList('name_az');
                        return this.updateRunStats();
                    });
            });

            return this;
        },

        setupClients: function () {
            this.catalog = new Catalog(this.runtime.getConfig('services.catalog.url'), {
                token: this.runtime.service('session').getAuthToken()
            });
            this.nms = new NarrativeMethodStore(this.runtime.getConfig('services.narrative_method_store.url'), {
                token: this.runtime.service('session').getAuthToken()
            });
            this.catalogClient = new GenericClient({
                module: 'Catalog',
                url: this.runtime.config('services.catalog.url'),
                token: this.runtime.service('session').getAuthToken()
            });
            this.nmsClient = new GenericClient({
                module: 'NarrativeMethodStore',
                url: this.runtime.config('services.narrative_method_store.url'),
                token: this.runtime.service('session').getAuthToken()
            });
            this.nms_base_url = this.runtime.getConfig('services.narrative_method_store.url');
            this.nms_base_url = this.nms_base_url.substring(0, this.nms_base_url.length - 3);
        },

        $ctrList: null,

        renderControlToolbar: function () {
            // CONTROL BAR CONTAINER
            var $nav = $('<nav>')
                .addClass('navbar navbar-default')
                .css({ border: '0', 'background-color': '#fff' });
            var $container = $('<div>').addClass('container-fluid');

            var $content = $('<div>').addClass('');

            $nav.append($container.append($content));

            // SEARCH
            var $searchBox = $('<input type="text" placeholder="Search" size="50">').addClass('form-control');
            $searchBox
                .on('input', () => {
                    this.filterApps($searchBox.val());
                })
                .bind('keypress', (e) => {
                    if (e.keyCode === 13) {
                        return false;
                    }
                });
            $content.append(
                $('<form>')
                    .addClass('navbar-form navbar-left')
                    .append(
                        $('<div>')
                            .addClass('form-group')
                            .append($searchBox)
                    )
            );

            // other controls list
            var $ctrList = $('<ul>')
                .addClass('nav navbar-nav')
                .css('font-family', '\'OxygenRegular\', Arial, sans-serif');
            this.$ctrList = $ctrList;
            $content.append($ctrList);

            // ORGANIZE BY
            var $obMyFavs = $('<a href="#">');
            if (this.isLoggedIn) {
                $obMyFavs.append('My Favorites').on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('my_favorites');
                });
            }
            var $obFavs = $('<a href="#">')
                .append('Favorites Count')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('favorites');
                });
            var $obRuns = $('<a href="#">')
                .append('Run Count')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('runs');
                });
            var $obNameAz = $('<a href="#">')
                .append('Name (a-z)')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('name_az');
                });
            var $obNameZa = $('<a href="#">')
                .append('Name (z-a)')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('name_za');
                });
            var $obCat = $('<a href="#">')
                .append('Category')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('category');
                });
            var $obModule = $('<a href="#">')
                .append('Module')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('module');
                });
            var $obOwner = $('<a href="#">')
                .append('Developer')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('developer');
                });
            var $obInput = $('<a href="#">')
                .append('Input Types')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('input_types');
                });
            var $obOutput = $('<a href="#">')
                .append('Output Types')
                .on('click', (e) => {
                    e.preventDefault();
                    this.renderAppList('output_types');
                });

            var $organizeBy = $('<li>')
                .addClass('dropdown')
                .append(
                    '<a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Organize by <span class="caret"></span></a>'
                );

            $organizeBy.append(
                $('<ul>')
                    .addClass('dropdown-menu')
                    .append($('<li>').append($obMyFavs))
                    .append($('<li>').append($obFavs))
                    .append($('<li>').append($obRuns))
                    .append('<li role="separator" class="divider"></li>')
                    .append($('<li>').append($obNameAz))
                    .append($('<li>').append($obNameZa))
                    .append('<li role="separator" class="divider"></li>')
                    .append($('<li>').append($obCat))
                    .append($('<li>').append($obModule))
                    .append($('<li>').append($obOwner))
                    .append('<li role="separator" class="divider"></li>')
                    .append($('<li>').append($obInput))
                    .append($('<li>').append($obOutput))
            );

            // PLACE CONTENT ON CONTROL BAR
            $content.append($ctrList.append($organizeBy));

            $nav.append($container);

            return [$nav, $searchBox];
        },

        addUserControls: function () {
            const $verR = this.runtime.$catalogLink('apps/release', 'Released Apps');
            const $verB = this.runtime.$catalogLink('apps/beta', 'Beta Apps');
            // var $verR = $('<a href="/foo#catalog/apps/release" target="_parent">').append('Released Apps');
            // var $verB = $('<a href="/foo#catalog/apps/beta" target="_parent">').append('Beta Apps');

            var $version = $('<li>')
                .addClass('dropdown')
                .append(
                    '<a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Version<span class="caret"></span></a>'
                );

            $version.append(
                $('<ul>')
                    .addClass('dropdown-menu')
                    .append($('<li>').append($verR))
                    .append($('<li>').append($verB))
            );

            var $helpLink = $('<li>').append(
                $('<a href="https://docs.kbase.us/apps" target="_blank">').append('<i class="fa fa-question-circle"></i> Help')
            );
            this.$ctrList.append($version).append($helpLink);
        },

        addDeveloperControls: function () {
            const $verR = this.runtime.$catalogLink('apps/release', 'Released Apps');
            const $verB = this.runtime.$catalogLink('apps/beta', 'Beta Apps');
            const $verD = this.runtime.$catalogLink('apps/dev', 'Apps in Development');

            var $version = $('<li>')
                .addClass('dropdown')
                .append(
                    '<a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Version<span class="caret"></span></a>'
                );

            $version.append(
                $('<ul>')
                    .addClass('dropdown-menu')
                    .append($('<li>').append($verR))
                    .append($('<li>').append($verB))
                    .append($('<li>').append($verD))
            );

            // NAV LINKS
            var $statusLink = $('<li>').append(this.runtime.$kbaseUILink("catalog/status", 'Status'));

            var $registerLink = $('<li>').append(this.runtime.$kbaseUILink('catalog/register', 'Add Module', {icon: 'plus-circle'}));

            var $indexLink = $('<li>').append(
                $(this.runtime.$kbaseUILink('catalog', 'Index', {icon: 'bars'}))
            );
            var $helpLink = $('<li>').append(
                $('<a href="https://docs.kbase.us/apps" target="_blank">').append('<i class="fa fa-question-circle"></i> Help')
            );

            this.$ctrList
                .append($version)
                .append($statusLink)
                .append($registerLink)
                .append($indexLink)
                .append($helpLink);
        },

        filterApps: function (query) {
            query = query.trim();
            if (query) {
                var terms = query.toLowerCase().match(/\w+|"(?:\\"|[^"])+"/g);
                if (terms) {
                    // for everything in the list
                    for (var k = 0; k < this.appList.length; k++) {
                        // for every term (every term must match to get a match)
                        var match = false; // every term must match
                        for (var t = 0; t < terms.length; t++) {
                            if (
                                terms[t].charAt(0) === '"' &&
                                terms[t].charAt(terms.length - 1) === '"' &&
                                terms[t].length > 2
                            ) {
                                terms[t] = terms[t].substring(1, terms[t].length - 1);
                                // the regex keeps quotes in quoted strings, so toss those
                            }
                            // filter on names
                            if (this.appList[k].info.name.toLowerCase().indexOf(terms[t]) >= 0) {
                                match = true;
                                continue;
                            }
                            // filter on module names, if they exist
                            if (this.appList[k].info.module_name) {
                                if (this.appList[k].info.module_name.toLowerCase().indexOf(terms[t]) >= 0) {
                                    match = true;
                                    continue;
                                }
                            }
                            // filter on other description
                            if (this.appList[k].info.subtitle) {
                                if (this.appList[k].info.subtitle.toLowerCase().indexOf(terms[t]) >= 0) {
                                    match = true;
                                    continue;
                                }
                            }

                            // filter on authors
                            if (this.appList[k].info.authors) {
                                var authorMatch = false;
                                for (var a = 0; a < this.appList[k].info.authors.length; a++) {
                                    if (this.appList[k].info.authors[a].toLowerCase().indexOf(terms[t]) >= 0) {
                                        authorMatch = true;
                                        break;
                                    }
                                }
                                if (authorMatch) {
                                    match = true;
                                    continue;
                                }
                            }

                            // filter on other stuff (input/output types?)

                            // if we get here, this term didnt' match anything, so we can break
                            match = false;
                            break;
                        }

                        // show or hide if we matched
                        if (match) {
                            this.appList[k].show();
                        } else {
                            this.appList[k].hide();
                        }
                    }
                } else {
                    this.clearFilter();
                }
            } else {
                this.clearFilter();
            }

            // hide/show sections
            var sections = this.$appListPanel.find('.catalog-section');
            for (var i = 0; i < sections.length; i++) {
                $(sections[i]).show();
                var cards = $(sections[i]).find('.kbcb-app-card-container,.kbcb-app-card-list-element');
                var hasVisible = false;
                for (var j = 0; j < cards.length; j++) {
                    if ($(cards[j]).is(':visible')) {
                        hasVisible = true;
                        break;
                    }
                }
                if (!hasVisible) {
                    $(sections[i]).hide();
                }
            }
        },

        clearFilter: function () {
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].show();
            }
        },

        initMainPanel: function () {
            var $mainPanel = $('<div>').addClass('container-fluid');
            var $appListPanel = $('<div>');
            var $moduleListPanel = $('<div>');
            $mainPanel.append($appListPanel);
            $mainPanel.append($moduleListPanel);
            return [$mainPanel, $appListPanel, $moduleListPanel];
        },

        showLoading: function () {
            this.$loadingPanel.show();
            this.$mainPanel.hide();
        },
        hideLoading: function () {
            this.$loadingPanel.hide();
            this.$mainPanel.show();
        },

        // we assume context is:
        //    catalog: catalog_client
        //    browserWidget: this widget, so we can toggle any update
        toggleFavorite: function (appCard) {
            var params = {};
            if (appCard.info.module_name) {
                params.module_name = appCard.info.module_name;
                params.id = appCard.info.id.split('/')[1];
            } else {
                params.id = appCard.info.id;
            }

            // check if is a favorite
            if (appCard.isStarOn()) {
                this.catalogClient
                    .callFunc('remove_favorite', [params])
                    .then(() => {
                        appCard.turnOffStar();
                        appCard.setStarCount(appCard.getStarCount() - 1);
                        this.updateMyFavorites();
                        return this.updateFavoritesCounts();
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    });
            } else {
                this.catalogClient
                    .callFunc('add_favorite', [params])
                    .then(() => {
                        appCard.turnOnStar();
                        appCard.setStarCount(appCard.getStarCount() + 1);
                        this.updateMyFavorites();
                        return this.updateFavoritesCounts();
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    });
            }
        },

        apps: null,
        populateAppList: function (tag) {

            return (
                this.nmsClient
                    .callFunc('list_methods', [{ tag: tag }])
                    // return this.nms.list_methods({ tag: tag })
                    .spread((apps) => {
                        this.apps = apps;
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        legacyApps: null,
        populateAppListWithLegacyApps: function () {
            // apps cannot be registered via the SDK, so don't have tag info
            return (
                this.nmsClient
                    .callFunc('list_apps', [{}])
                    // return this.nms.list_apps({})
                    .spread((legacyApps) => {
                        this.legacyApps = legacyApps;
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        populateModuleList: function (only_released) {
            var moduleSelection = {
                include_released: 1,
                include_unreleased: 1,
                include_disabled: 0
            };
            if (only_released && only_released === true) {
                moduleSelection['include_unreleased'] = 0;
            }

            return (
                this.catalogClient
                    .callFunc('list_basic_module_info', [moduleSelection])
                    // return this.catalog.list_basic_module_info(moduleSelection)
                    .spread((modules) => {
                        this.moduleLookup = {}; // {module_name: {info:{}, hash1:'tag', hash:'tag', ...}
                        for (var k = 0; k < modules.length; k++) {
                            this.moduleLookup[modules[k]['module_name']] = modules[k];
                        }
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        updateRunStats: function () {
            var options = {};
            return (
                this.catalogClient
                    .callFunc('get_exec_aggr_stats', [options])
                    // return this.catalog.get_exec_aggr_stats(options)
                    .spread((stats) => {
                        this.runStats = stats;
                        for (var k = 0; k < stats.length; k++) {
                            var lookup = stats[k].full_app_id;
                            var idTokens = stats[k].full_app_id.split('/');
                            if (idTokens.length === 2) {
                                lookup = idTokens[0].toLowerCase() + '/' + idTokens[1];
                            }
                            if (this.appLookup[lookup]) {
                                this.appLookup[lookup].setRunCount(stats[k].number_of_calls);
                            }
                        }
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        isDeveloper: function () {
            const currentUsername = this.runtime.service('session').getUsername();
            return (
                this.catalogClient
                    .callFunc('is_approved_developer', [[currentUsername]])
                    .spread((isDev) => {
                        if (isDev && isDev.length > 0 && isDev[0] === 1) {
                            this.addDeveloperControls();
                        } else {
                            this.addUserControls();
                        }
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        updateFavoritesCounts: function () {
            var listFavoritesParams = {};
            return (
                this.catalogClient
                    .callFunc('list_favorite_counts', [listFavoritesParams])
                    // return this.catalog.list_favorite_counts(listFavoritesParams)
                    .spread((counts) => {
                        for (var k = 0; k < counts.length; k++) {
                            var c = counts[k];
                            var lookup = c.id;
                            if (c.module_name_lc !== 'nms.legacy') {
                                lookup = c.module_name_lc + '/' + lookup;
                            }
                            if (this.appLookup[lookup]) {
                                this.appLookup[lookup].setStarCount(c.count);
                            }
                        }
                    })
                    .catch((err) => {
                        console.error('ERROR', err);
                    })
            );
        },

        // warning!  will not return a promise if the user is not logged in!
        updateMyFavorites: function () {
            if (this.isLoggedIn) {
                var currentUsername = this.runtime.service('session').getUsername();
                return (
                    this.catalogClient
                        .callFunc('list_favorites', [currentUsername])
                        // return this.catalog.list_favorites(currentUsername)
                        .spread((favorites) => {
                            this.favoritesList = favorites;
                            for (var k = 0; k < this.favoritesList.length; k++) {
                                var fav = this.favoritesList[k];
                                var lookup = fav.id;
                                if (fav.module_name_lc !== 'nms.legacy') {
                                    lookup = fav.module_name_lc + '/' + lookup;
                                }
                                if (this.appLookup[lookup]) {
                                    this.appLookup[lookup].turnOnStar(fav.timestamp);
                                }
                            }
                        })
                        .catch((err) => {
                            console.error('ERROR', err);
                        })
                );
            }
        },

        processData: function () {
            // module lookup table should already exist
            // instantiate the app cards and create the app lookup table
            this.appLookup = {};

            for (var k = 0; k < this.apps.length; k++) {
                if (this.apps[k].loading_error) {
                    console.warn('Error in spec, will not be loaded:', this.apps[k]);
                    continue;
                }

                // logic to hide/show certain categories
                if (this.util.skipApp(this.apps[k].categories)) continue;

                // if we are showing dev/beta, do not show non-sdk methods
                if (this.options.tag !== 'release') {
                    if (!this.apps[k]['module_name']) {
                        continue;
                    }
                }

                //    legacy : true | false // indicates if this is a legacy App or SDK App
                //    app:  { .. }  // app info returned (for now) from NMS
                //    module: { .. }  // module info returned for SDK methods
                //    favoritesCallback: function () // function called when favorites button is clicked
                //    isLoggedIn: true | false

                var m = new AppCard({
                    runtime: this.runtime,
                    legacy: false,
                    app: this.apps[k],
                    module: this.moduleLookup[this.apps[k]['module_name']],
                    nms_base_url: this.nms_base_url,
                    favoritesCallback: (appCard) => {
                        this.toggleFavorite(appCard);
                    },
                    isLoggedIn: this.isLoggedIn,
                    showReleaseTagLabels: this.showReleaseTagLabels,
                    linkTag: this.options.tag
                });
                this.appList.push(m);

                if (m.info.module_name) {
                    var idTokens = m.info.id.split('/');
                    this.appLookup[idTokens[0].toLowerCase() + '/' + idTokens[1]] = m;
                } else {
                    this.appLookup[m.info.id] = m;
                }
            }

            // HANDLE LEGACY APPS!!
            for (k = 0; k < this.legacyApps.length; k++) {
                if (this.legacyApps[k].loading_error) {
                    console.warn('Error in spec, will not be loaded:', this.legacyApps[k]);
                    continue;
                }
                if (this.util.skipApp(this.legacyApps[k].categories)) continue;
                var a = new AppCard({
                    runtime: this.runtime,
                    legacy: true,
                    app: this.legacyApps[k],
                    nms_base_url: this.nms_base_url,
                    isLoggedIn: this.isLoggedIn,
                    linkTag: this.options.tag
                });
                this.appList.push(a);
            }

            this.developers = {};
            this.inputTypes = {};
            this.outputTypes = {};

            this.appList.forEach((app) => {
                if (app.info.app_type === 'app') {
                    app.info.authors.forEach((author) => {
                        this.developers[author] = true;
                    });

                    app.info.input_types.forEach((inputType) => {
                        this.inputTypes[inputType] = true;
                    });

                    app.info.output_types.forEach((outputType) => {
                        this.outputTypes[outputType] = true;
                    });
                }
            });
        },

        /*
         Sort the app list by a predermined sort method.
         This is very useful to call before a viewer, since they
         may be chained together without re-rendering.
         */
        sortBy: function (sortMethod) {
            switch (sortMethod) {
            case 'favorites':
                // sort by number of stars, then by app name
                this.appList.sort((a, b) => {
                    var aStars = a.getStarCount();
                    var bStars = b.getStarCount();
                    if (aStars > bStars) return -1;
                    if (bStars > aStars) return 1;
                    var aName = a.info.name.toLowerCase();
                    var bName = b.info.name.toLowerCase();
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                });
                break;
            default:
                // do nothing.
                console.warn('Unsupported sort method "' + sortMethod + '"');
            }
        },

        renderByCategory: function () {
            var cats = categoriesConfig.orderings[categoriesConfig.orderings.default];
            var $catDivLookup = {};

            cats.forEach((category) => {
                var $section = $('<div>').addClass('catalog-section');
                var $catDiv = $('<div>').addClass('kbcb-app-card-list-container');
                $catDivLookup[category] = $catDiv;
                $section.append(
                    $('<div>')
                        .css({ color: '#777' })
                        .append($('<h4>').append(this.categories[category]))
                );
                $section.append($catDiv);
                this.$appListPanel.append($section);
            });
            var $section = $('<div>').addClass('catalog-section');
            var $noCatDiv = $('<div>').addClass('kbcb-app-card-list-container');
            $section.append(
                $('<div>')
                    .css({ color: '#777' })
                    .append($('<h4>').append('Uncategorized'))
            );
            $section.append($noCatDiv);
            this.$appListPanel.append($section);

            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();

                if (this.appList[k].info.categories.length > 0) {
                    var appCats = this.appList[k].info.categories;
                    var gotCat = false;
                    for (var i = 0; i < appCats.length; i++) {
                        if (Object.prototype.hasOwnProperty.call($catDivLookup, appCats[i])) {
                            gotCat = true;
                            $catDivLookup[appCats[i]].append(this.appList[k].getNewCardDiv());
                        }
                    }
                    if (!gotCat) {
                        $noCatDiv.append(this.appList[k].getNewCardDiv());
                    }
                } else {
                    $noCatDiv.append(this.appList[k].getNewCardDiv());
                }
            }
        },

        renderByAZ: function () {
            // sort by method name, A to Z
            this.appList.sort((a, b) => {
                if (a.info.name.toLowerCase() < b.info.name.toLowerCase()) {
                    return -1;
                }
                if (a.info.name.toLowerCase() > b.info.name.toLowerCase()) {
                    return 1;
                }
                return 0;
            });
            var $listContainer = $('<div>').css({ overflow: 'auto', padding: '0 0 2em 0' });
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                $listContainer.append(this.appList[k].getNewCardDiv());
            }
            this.$appListPanel.append($listContainer);
        },

        renderByZA: function () {
            // sort by method name, Z to A
            this.appList.sort((a, b) => {
                if (a.info.name.toLowerCase() < b.info.name.toLowerCase()) {
                    return 1;
                }
                if (a.info.name.toLowerCase() > b.info.name.toLowerCase()) {
                    return -1;
                }
                return 0;
            });
            var $listContainer = $('<div>').css({ overflow: 'auto', padding: '0 0 2em 0' });
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                $listContainer.append(this.appList[k].getNewCardDiv());
            }
            this.$appListPanel.append($listContainer);
        },

        renderByModule: function () {
            // Organization by module is simple because things can only be in one module, we sort and group them by module

            this.appList.sort((a, b) => {
                if (a.info.module_name && b.info.module_name) {
                    if (a.info.module_name.toLowerCase() < b.info.module_name.toLowerCase()) return -1;
                    if (a.info.module_name.toLowerCase() > b.info.module_name.toLowerCase()) return 1;
                    if (a.info.name.toLowerCase() < b.info.name.toLowerCase()) return -1;
                    if (a.info.name.toLowerCase() > b.info.name.toLowerCase()) return 1;
                    return 0;
                }
                if (a.info.module_name) return -1;
                if (b.info.module_name) return 1;
                return 0;
            });
            var currentModuleName = '';
            var $currentModuleDiv = null;
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();

                var info = this.appList[k].info;

                var m = info.module_name;
                if (!m) {
                    m = 'Not in an SDK Module';
                }

                if (currentModuleName !== m) {
                    currentModuleName = m;
                    var $section = $('<div>').addClass('catalog-section');
                    $currentModuleDiv = $('<div>').addClass('kbcb-app-card-list-container');
                    $section.append(
                        $('<div>')
                            .css({ color: '#777' })
                            .append(
                                $('<h4>')
                                    .append(this.runtime.$kbaseUILink(`catalog/modules/${m}`, m))
                            )
                    );
                    $section.append($currentModuleDiv);
                    this.$appListPanel.append($section);
                }
                $currentModuleDiv.append(this.appList[k].getNewCardDiv());
            }
        },

        renderByDeveloper: function () {
            // get and sort the dev list
            var devs = [];
            for (var k in this.developers) {
                devs.push(k);
            }
            devs.sort();

            // create the sections per author
            var $authorDivLookup = {};
            for (k = 0; k < devs.length; k++) {
                var $section = $('<div>').addClass('catalog-section');
                var $authorDiv = $('<div>').addClass('kbcb-app-card-list-container');
                $authorDivLookup[devs[k]] = $authorDiv;
                $section.append(
                    $('<div>')
                        .css({ color: '#777' })
                        .append(
                            $('<h4>')
                                .append(this.runtime.$europaKBaseUILink(`people/${devs[k]}`, devs[k]))
                        )
                );
                $section.append($authorDiv);
                this.$appListPanel.append($section);
            }
            $section = $('<div>').addClass('catalog-section');
            var $noAuthorDiv = $('<div>').addClass('kbcb-app-card-list-container');
            $section.append(
                $('<div>')
                    .css({ color: '#777' })
                    .append($('<h4>').append('No Developer Specified'))
            );
            $section.append($noAuthorDiv);
            this.$appListPanel.append($section);

            // render the app list
            for (k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                if (this.appList[k].info.app_type === 'app') {
                    if (this.appList[k].info.authors.length > 0) {
                        var authors = this.appList[k].info.authors;
                        for (var i = 0; i < authors.length; i++) {
                            $authorDivLookup[authors[i]].append(this.appList[k].getNewCardDiv());
                        }
                    } else {
                        $noAuthorDiv.append(this.appList[k].getNewCardDiv());
                    }
                } else {
                    $noAuthorDiv.append(this.appList[k].getNewCardDiv());
                }
            }
        },

        renderByMyFavorites: function () {
            // sort by number of stars, then by app name
            this.appList.sort((a, b) => {
                // sort by time favorited
                if (a.isStarOn() && b.isStarOn()) {
                    if (a.getStarTime() > b.getStarTime()) return -1;
                    if (a.getStarTime() < b.getStarTime()) return 1;
                }

                // otherwise sort by stars
                var aStars = a.getStarCount();
                var bStars = b.getStarCount();
                if (aStars > bStars) return -1;
                if (bStars > aStars) return 1;
                var aName = a.info.name.toLowerCase();
                var bName = b.info.name.toLowerCase();
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });
            var $mySection = $('<div>').addClass('catalog-section');
            var $myDiv = $('<div>').addClass('kbcb-app-card-list-container');
            $mySection.append(
                $('<div>')
                    .css({ color: '#777' })
                    .append($('<h4>').append('My Favorites'))
            );
            $mySection.append($myDiv);
            this.$appListPanel.append($mySection);

            var $otherSection = $('<div>').addClass('catalog-section');
            var $otherDiv = $('<div>').addClass('kbcb-app-card-list-container');
            $otherSection.append(
                $('<div>')
                    .css({ color: '#777' })
                    .append($('<h4>').append('Everything Else'))
            );
            $otherSection.append($otherDiv);
            this.$appListPanel.append($otherSection);
            var hasFavorites = false;
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                if (this.appList[k].isStarOn()) {
                    $myDiv.append(this.appList[k].getNewCardDiv());
                    hasFavorites = true;
                } else {
                    $otherDiv.append(this.appList[k].getNewCardDiv());
                }
            }
            if (!hasFavorites) {
                $myDiv.append(
                    $('<div>')
                        .css({ color: '#777' })
                        .addClass('kbcb-app-card-list-element')
                        .append('You do not have any favorites yet.  Click on the stars to add to your favorites.')
                );
            }
        },

        renderByFavorites: function () {
            // sort by number of stars, then by app name
            this.appList.sort((a, b) => {
                var aStars = a.getStarCount();
                var bStars = b.getStarCount();
                if (aStars > bStars) return -1;
                if (bStars > aStars) return 1;
                var aName = a.info.name.toLowerCase();
                var bName = b.info.name.toLowerCase();
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });
            var $listContainer = $('<div>').css({ overflow: 'auto', padding: '0 0 2em 0' });
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                $listContainer.append(this.appList[k].getNewCardDiv());
            }
            this.$appListPanel.append($listContainer);
        },

        renderTypes: function (types, type_field) {
            // create the sections per type
            const $typeDivLookup = {};
            types.forEach((type) => {
                const $section = $('<div>').addClass('catalog-section');
                const $typeDiv = $('<div>').addClass('kbcb-app-card-list-container');
                const url_prefix = type.includes('.') ? 'type' : 'module';
                $typeDivLookup[type] = $typeDiv;

                $section.append(
                    $('<div>')
                        .css({ color: '#777' })
                        .append(
                            $('<h4>').append(
                                this.runtime.$europaKBaseUILink(`spec/${url_prefix}/${type}`, type)
                            )
                        )
                );

                $section.append($typeDiv);
                this.$appListPanel.append($section);
            });

            // create section for apps without an input type
            const $section = $('<div>').addClass('catalog-section');
            const $typeDiv = $('<div>').addClass('kbcb-app-card-list-container');
            $typeDivLookup.none = $typeDiv;
            $section.append(
                $('<div>').css({ 'color': '#777' })
                    .append($('<h4>').append($('<span>None</span>'))));
            $section.append($typeDiv);
            this.$appListPanel.append($section);

            // render the app list
            this.appList.forEach((app) => {
                app.clearCardsAddedCount();
                if (app.info.app_type === 'app') {
                    if (app.info[type_field].length > 0) {
                        app.info[type_field].forEach((type) => {
                            $typeDivLookup[type].append(app.getNewCardDiv());
                        });
                    } else {
                        $typeDivLookup.none.append(app.getNewCardDiv());
                    }
                }
            });
        },

        renderbyInputTypes: function () {
            // get and sort the type list
            const types = Object.keys(this.inputTypes).sort();
            const type_field = 'input_types';
            this.renderTypes(types, type_field);
        },

        renderByOutputTypes: function () {
            // get and sort the type list
            const types = Object.keys(this.outputTypes).sort();
            const type_field = 'output_types';
            this.renderTypes(types, type_field);
        },

        renderByRuns: function () {
            this.$appListPanel.append(
                '<div><i>Note: Run counts for legacy methods released before 2016 are not reported.</i><br><br></div>'
            );

            // sort by runs, then by app name
            this.appList.sort((a, b) => {
                var aRuns = a.getRunCount();
                var bRuns = b.getRunCount();
                if (aRuns > bRuns) return -1;
                if (bRuns > aRuns) return 1;
                var aName = a.info.name.toLowerCase();
                var bName = b.info.name.toLowerCase();
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });
            var $listContainer = $('<div>').css({ overflow: 'auto', padding: '0 0 2em 0' });
            for (var k = 0; k < this.appList.length; k++) {
                this.appList[k].clearCardsAddedCount();
                $listContainer.append(this.appList[k].getNewCardDiv());
            }
            this.$appListPanel.append($listContainer);
        },

        renderAppList: function (organizeBy) {
            this.$appListPanel.children().detach();

            if (this.options.tag) {
                var text_css = { color: '#777', 'font-size': '1.1em', margin: '5px' };
                if (this.options.tag === 'dev') {
                    this.$appListPanel.append(
                        $('<div>')
                            .css(text_css)
                            .append('Currently viewing Apps under development.')
                    );
                } else if (this.options.tag === 'beta') {
                    this.$appListPanel.append(
                        $('<div>')
                            .css(text_css)
                            .append('Currently viewing Apps in beta.')
                    );
                }
            }

            // no organization, so show all
            if (!organizeBy) {
                return;
            }

            if (organizeBy === 'name_az') {
                this.renderByAZ();
            } else if (organizeBy === 'name_za') {
                this.renderByZA();
            } else if (organizeBy === 'module') {
                this.renderByModule();
            } else if (organizeBy === 'developer') {
                this.renderByDeveloper();
            } else if (organizeBy === 'category') {
                this.renderByCategory();
            } else if (organizeBy === 'my_favorites') {
                this.renderByMyFavorites();
            } else if (organizeBy === 'favorites') {
                this.renderByFavorites();
            } else if (organizeBy === 'runs') {
                this.renderByRuns();
            } else if (organizeBy === 'input_types') {
                this.renderbyInputTypes();
            } else if (organizeBy === 'output_types') {
                this.renderByOutputTypes();
            } else {
                this.$appListPanel.append('<span>invalid organization parameter</span>');
            }

            // gives some buffer at the end of the page
            this.$appListPanel.append($('<div>').css('padding', '4em'));

            this.filterApps(this.$searchBox.val());
        },

        showError: function (error) {
            this.$errorPanel.empty();
            this.$errorPanel.append('<strong>Error when fetching App/Method information.</strong><br><br>');
            this.$errorPanel.append(error.error.message);
            this.$errorPanel.append('<br>');
            this.$errorPanel.show();
        }
    });
});
