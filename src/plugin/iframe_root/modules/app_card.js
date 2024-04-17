define(['jquery'], ($) => {
    function AppCard(params) {
        this.$divs = [];
        this.runtime = params.runtime;
        this.info = params.app;
        this.module = params.module;
        this.legacy = params.legacy;
        this.nms_base_url = params.nms_base_url;
        this.isLoggedIn = params.isLoggedIn;
        this.showReleaseTagLabels = false;
        this.linkTag = params.linkTag;
        if (params.showReleaseTagLabels && params.showReleaseTagLabels == true) {
            this.showReleaseTagLabels = true;
        }

        // fix missing fields
        if (!this.info.authors) {
            console.warn('authors property missing in app info', this.info);
            this.info.authors = [];
        }

        this.cardsAdded = 0;

        this.favoritesCallback = params.favoritesCallback;

        // only an SDK module if it has a module name
        this.isSdk = false;
        if (this.module) {
            this.isSdk = true;
        }

        this.show = function () {
            for (let k = 0; k < this.$divs.length; k++) {
                this.$divs[k].show();
            }
        };

        this.hide = function () {
            for (let k = 0; k < this.$divs.length; k++) {
                this.$divs[k].hide();
            }
        };

        /* get a new card that can be added to a DOM element */
        this.getNewCardDiv = function () {
            this.cardsAdded += 1;
            if (this.$divs.length < this.cardsAdded) {
                const $newCard = this._renderAppCard();
                this.$divs.push($newCard);
                return $newCard;
            }
            return this.$divs[this.cardsAdded - 1];
        };

        /* assumes the cards have been detached from DOM*/
        this.clearCardsAddedCount = function () {
            this.cardsAdded = 0;
        };

        this.clearCardsFromMemory = function () {
            this.cardsAdded = 0;
            this.$divs = 0;
        };

        this.starCount = null;
        this.onStar = false;
        this.deactivatedStar = false;
        this.onStarTime = 0;

        /* timestamp => the time at which this was favorited, optional */
        this.turnOnStar = function (timestamp) {
            this.onStar = true;
            for (let k = 0; k < this.$divs.length; k++) {
                this.$divs[k]
                    .find('.kbcb-star')
                    .removeClass('kbcb-star-nonfavorite')
                    .addClass('kbcb-star-favorite');
            }
            if (timestamp) {
                this.onStarTime = timestamp;
            }
        };
        this.turnOffStar = function () {
            this.onStar = false;
            for (let k = 0; k < this.$divs.length; k++) {
                this.$divs[k]
                    .find('.kbcb-star')
                    .removeClass('kbcb-star-favorite')
                    .addClass('kbcb-star-nonfavorite');
            }
        };

        this.isStarOn = function () {
            return this.onStar;
        };
        this.getStarTime = function () {
            return this.onStarTime;
        };

        this.deactivateStar = function () {
            this.deactivatedStar = true;
            for (let k = 0; k < this.$divs.length; k++) {
                this.$divs[k]
                    .find('.kbcb-star')
                    .removeClass('kbcb-star-favorite')
                    .removeClass('kbcb-star-nonfavorite');
            }
        };

        this.getStarCount = function () {
            if (this.starCount) {
                return this.starCount;
            }
            return 0;
        };

        this.setStarCount = function (count) {
            this.starCount = count;
            if (this.starCount <= 0) {
                this.starCount = null;
            }
            if (this.starCount) {
                for (var k = 0; k < this.$divs.length; k++) {
                    this.$divs[k].find('.kbcb-star-count').html(count);
                }
            } else {
                for (k = 0; k < this.$divs.length; k++) {
                    this.$divs[k].find('.kbcb-star-count').empty();
                }
            }
        };

        this.runCount = null;

        this.setRunCount = function (runs) {
            this.runCount = runs;
            if (this.runCount) {
                for (let k = 0; k < this.$divs.length; k++) {
                    this.$divs[k]
                        .find('.kbcb-runs')
                        .empty()
                        .append('<i class="fa fa-share"></i>')
                        .append(
                            $('<span>')
                                .addClass('kbcb-run-count')
                                .append(this.runCount)
                        )
                        .tooltip({
                            title: `Ran in a Narrative ${  this.runCount  } times.`,
                            placement: 'bottom',
                            container: 'body',
                            delay: {show: 400, hide: 40}
                        });
                }
            }
        };
        this.getRunCount = function () {
            if (this.runCount) return this.runCount;
            return 0;
        };

        /* rendering methods that are shared in multiple places */
        this._renderAppCard = function () {
            const info = this.info;
            const module = this.module;
            const legacy = this.legacy;
            const isSdk = this.isSdk;
            const nms_base_url = this.nms_base_url;
            const linkTag = this.linkTag;

            // Main Container
            const $appDiv = $('<div>').addClass('kbcb-app-card kbcb-hover xcontainer-fluid');

            // HEADER - contains logo, title, module link, authors
            const $topDiv = $('<div>').addClass('xrow kbcb-app-card-header');
            const $logoSpan = $('<div>').addClass('col-xs-3 kbcb-app-card-logo');

            if (!legacy) {
                $logoSpan.append(
                    '<div class="fa-stack fa-3x"><i class="fa fa-square fa-stack-2x method-icon"></i><i class="fa fa-inverse fa-stack-1x fa-cube"></i></div>'
                );
            } else {
                $logoSpan.append(
                    '<span class="fa-stack fa-3x"><span class="fa fa-square fa-stack-2x app-icon"></span><span class="fa fa-inverse fa-stack-1x fa-cubes" style=""></span></span>'
                );
            }

            // add actual logos here
            if (info.icon && nms_base_url) {
                if (info.icon.url) {
                    $logoSpan.html(
                        $(`<img src="${  nms_base_url  }${info.icon.url  }">`).css({
                            'max-width': '100%',
                            padding: '6px 3px 3px 0px',
                            'max-height': '85%'
                        })
                    );
                }
            }

            const $titleSpan = $('<div>').addClass('col-xs-9 kbcb-app-card-title-panel');

            $titleSpan.append(
                $('<div>')
                    .addClass('kbcb-app-card-title')
                    .append(info.name)
            );
            if (isSdk) {
                $titleSpan.append(
                    $('<div>')
                        .addClass('kbcb-app-card-module')
                        .append(this.runtime.$kbaseUILink(
                            `catalog/modules/${module.module_name}`,
                            module.module_name,
                            {stopPropagation: true}))
                );
            }

            if (!legacy) {
                if (info.authors.length > 0) {
                    const $authorDiv = $('<div>')
                        .addClass('kbcb-app-card-authors')
                        .append('by ');
                    for (let k = 0; k < info.authors.length; k++) {
                        if (k >= 1) {
                            $authorDiv.append(', ');
                        }
                        if (k >= 2) {
                            $authorDiv.append(` +${info.authors.length - 2} more`);
                            break;
                        }
                        $authorDiv.append(
                            this.runtime.$europaKBaseUILink(`people/${info.authors[k]}`, info.authors[k], {stopPropagation: true})
                        );
                    }
                    $titleSpan.append($authorDiv);
                }
            }

            $appDiv.append($topDiv.append($logoSpan).append($titleSpan));

            // SUBTITLE - on mouseover of info, show subtitle information
            const $subtitle = $('<div>')
                .addClass('kbcb-app-card-subtitle')
                .append(info.subtitle)
                .hide();
            $appDiv.append($subtitle);

            // FOOTER - stars, number of runs, and info mouseover area
            const $footer = $('<div>').addClass('clearfix kbcb-app-card-footer');

            if (!legacy) {
                const $starDiv = $('<div>')
                    .addClass('col-xs-3')
                    .css('text-align', 'left');
                const $star = $('<span>')
                    .addClass('kbcb-star')
                    .append('<i class="fa fa-star"></i>');
                var self = this;
                if (self.isLoggedIn) {
                    $star.addClass('kbcb-star-nonfavorite');
                    $star.on('click', (event) => {
                        event.stopPropagation();
                        if (!self.deactivatedStar && self.favoritesCallback) {
                            self.favoritesCallback(self);
                        }
                    });
                    $starDiv.tooltip({
                        title: 'Click on the star to add/remove from your favorites',
                        placement: 'bottom',
                        container: 'body',
                        delay: {show: 400, hide: 40}
                    });
                }
                const $starCount = $('<span>').addClass('kbcb-star-count');
                if (this.starCount) {
                    $starCount.html(this.starCount);
                }
                if (this.onStar) {
                    $star.removeClass('kbcb-star-nonfavorite').addClass('kbcb-star-favorite');
                }
                $footer.append($starDiv.append($star).append($starCount));
            } else {
                $footer.append($('<div>').addClass('col-xs-3'));
            }

            if (isSdk) {
                const nRuns = Math.floor(Math.random() * 10000);
                const $nRuns = $('<div>')
                    .addClass('col-xs-3')
                    .css('text-align', 'left');
                $nRuns.append($('<span>').addClass('kbcb-runs'));
                if (this.nRuns) {
                    $nRuns
                        .append('<i class="fa fa-share"></i>')
                        .append(
                            $('<span>')
                                .addClass('kbcb-run-count')
                                .append(this.nRuns)
                        )
                        .tooltip({
                            title: `Ran in a Narrative ${  nRuns  } times.`,
                            container: 'body',
                            placement: 'bottom',
                            delay: {show: 400, hide: 40}
                        });
                }
                $footer.append($nRuns);
            } else {
                $footer.append($('<div>').addClass('col-xs-3'));
            }

            // version tags
            if (this.showReleaseTagLabels) {
                if (isSdk) {
                    const $ver_tags = $('<div>')
                        .addClass('col-xs-4')
                        .css('text-align', 'left');
                    if (
                        module.release &&
                        module.release.git_commit_hash &&
                        module.release.git_commit_hash === info.git_commit_hash
                    ) {
                        $ver_tags.append(
                            $('<span>')
                                .addClass('label label-primary')
                                .append('R')
                                .tooltip({
                                    title: 'Tagged as the latest released version.',
                                    placement: 'bottom',
                                    container: 'body',
                                    delay: {show: 400, hide: 40}
                                })
                        );
                    }
                    if (
                        module.beta &&
                        module.beta.git_commit_hash &&
                        module.beta.git_commit_hash === info.git_commit_hash
                    ) {
                        $ver_tags.append(
                            $('<span>')
                                .addClass('label label-info')
                                .append('B')
                                .tooltip({
                                    title: 'Tagged as the current beta version.',
                                    placement: 'bottom',
                                    container: 'body',
                                    delay: {show: 400, hide: 40}
                                })
                        );
                    }
                    if (
                        module.dev &&
                        module.dev.git_commit_hash &&
                        module.dev.git_commit_hash === info.git_commit_hash
                    ) {
                        $ver_tags.append(
                            $('<span>')
                                .addClass('label label-default')
                                .append('D')
                                .tooltip({
                                    title: 'Tagged as the current development version.',
                                    placement: 'bottom',
                                    container: 'body',
                                    delay: {show: 400, hide: 40}
                                })
                        );
                    }
                    $footer.append($ver_tags);
                } else {
                    $footer.append(
                        $('<div>')
                            .addClass('col-xs-4')
                            .css('text-align', 'left')
                            .append('<span class="label label-primary">R</span>')
                    );
                }
            } else {
                $footer.append(
                    $('<div>')
                        .addClass('col-xs-4')
                        .css('text-align', 'left')
                );
            }

            const $moreInfoDiv = $('<div>')
                .addClass('col-xs-1')
                .addClass('kbcb-info')
                .css('text-align', 'right');
            $moreInfoDiv
                .on('mouseenter', () => {
                    $topDiv.hide();
                    $subtitle.fadeIn('fast');
                })
                .on('mouseleave', () => {
                    $subtitle.hide();
                    $topDiv.fadeIn('fast');
                });
            $moreInfoDiv.append($('<span>').append('<i class="fa fa-info"></i>'));
            $footer.append($moreInfoDiv);
            $appDiv.append($footer);

            $appDiv.on('click', () => {
                if (!legacy) {
                    if (info.module_name) {
                        // module name right now is encoded in the ID
                        if (linkTag) {
                            self.runtime.catalogNavigate(`apps/${info.id}/${linkTag}`);
                        } else {
                            self.runtime.catalogNavigate(`apps/${info.id}`);
                        }
                    } else {
                        // legacy method, encoded as l.m
                        self.runtime.catalogNavigate(`apps/l.m/${info.id}`);
                    }
                } else {
                    // TODO: I don't think this path is supported any longer
                    //       (for as long as I remember!)
                    // apps still go to old style page
                    self.runtime.catalogNavigate(`narrativestore/app/${info.id}`);
                    // window.parent.location.href = '/#narrativestore/app/' + info.id;
                }
            });

            // put it all in a container so we can control margins
            const $appCardContainer = $('<div>').addClass('kbcb-app-card-container');
            return $appCardContainer.append($appDiv);
        };
    }

    return AppCard;
});
