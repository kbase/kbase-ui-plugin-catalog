define([
    'preact',
    'htm',
    'dompurify',
    'jquery',
    'components/KBaseUILink',
    'components/CatalogLink',
    'components/EuropaKBaseUILink',
    'components/BackToCatalogLink',

    // for effect
    'css!./CatalogAppViewer.css',
    'bootstrap'
], (
    preact,
    htm,
    DOMPurify,
    jquery,
    KBaseUILink,
    CatalogLink,
    EuropaKBaseUILink,
    BackToCatalogLink
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    function interpolate(someArray, someValue) {
        const result = [];
        someArray.forEach((value, index) => {
            result.push(value);
            if (index < someArray.length -1) {
                result.push(someValue);
            }
        });
        return result;
    }

    function getNiceDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        seconds = seconds - hours * 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = seconds - minutes * 60;

        let duration = '';
        if (hours > 0) {
            duration = `${hours  }h ${  minutes  }m`;
        } else if (minutes > 0) {
            duration = `${minutes  }m ${  Math.round(seconds)  }s`;
        } else {
            duration = `${Math.round(seconds * 100) / 100  }s`;
        }
        return duration;
    }

    class CatalogAppViewer extends Component {

        renderMethod() {

        }

        renderLogo() {
            const appFullInfo = this.props.appState.appFullInfo;
            if (appFullInfo.icon && this.props.nms_image_url) {
                return html`
                    <img src="${this.props.nms_image_url}/${appFullInfo.icon.url}" />`;
            }
            return html`
                <div class="fa-stack fa-3x">
                    <i class="fa fa-square fa-stack-2x method-icon" />
                    <i class="fa fa-inverse fa-stack-1x fa-cube" />
                </div>
            `;
        }

        renderAuthors() {
            const appFullInfo = this.props.appState.appFullInfo;
            if (appFullInfo.authors.length === 0) {
                return html`<div>n/a</div>`;
            }
            const authors =  interpolate(appFullInfo.authors.map((author) => {
                return html`<${EuropaKBaseUILink} hash=${`people/${author}`} newWindow=${true}>${author}</>`;
            }), html`<span>, </span>`);
            return html`<span>by ${authors}</span>`;
        }

        renderTitle() {
            const appFullInfo = this.props.appState.appFullInfo;

            return html`
                <div >
                    ${appFullInfo.name}
                </div>
            `;
        }

        renderModule() {
            const moduleDetails = this.props.appState.moduleDetails;
            if (!moduleDetails.info) {
                return;
            }

            return html`
                <div>
                    <${CatalogLink} runtime=${this.props.runtime} path="modules/${moduleDetails.info.module_name}">
                        ${moduleDetails.info.module_name}
                    </> 
                    ${' '}
                    v${moduleDetails.info.version}
                </div>
            `;
        }

        onStarClick() {
            this.props.toggleFavorite();
        }

        renderStar() {
            let starClass;
            if (this.props.appState.favorites.isFavorite) {
                starClass = '-favorite';
            } else {
                starClass = '-nonfavorite';
            }
            return html`
                <div className="-star" 
                     onclick=${this.onStarClick.bind(this)}
                     title="Click on the star to add/remove from your favorites.">
                    <i className=${`fa fa-star ${starClass}`}></i>
                    ${' '}
                    <span>${this.props.appState.favorites.count}</span>
                </div>
            `;
        }

        renderReleaseTagsDiv() {
            if (this.props.appState.moduleDetails.info) {
                const releaseTags = this.props.appState.moduleDetails.info.release_tags;
                const tagClass = {
                    release: 'primary',
                    beta: 'info',
                    dev: 'default'
                };
                return releaseTags.map((tag) => {
                    return html`
                        <span className="label label-${tagClass[tag]}" 
                            style=${{padding: '0.3em 0.6em 0.3em'}}
                            title="Tagged as the latest released version." >
                            ${tag.slice(0,1).toUpperCase()}
                        </span>
                    `;
                });
            }
            return html`
                <span className="label label-primary" 
                    style=${{padding: '0.3em 0.6em 0.3em'}}
                    title="Tagged as the latest released version." >
                    R
                </span>
            `;
        }

        renderRunStats() {
            if (this.props.isLegacyMethod || this.props.isLegacyApp) {
                return html`
                    <small>Run statistics cannot be displayed for this method.</small>
                `;
            }
            const stats = this.props.appState.runStats;
            if (!stats) {
                return html`<div className="-runStatsBar">
                    <i>stats not available</i>
                </div>`;
            }
            // if (stats.length === 0) {
            //     return html`<span>n/a</span>`;
            // }
            const goodCalls = stats.number_of_calls - stats.number_of_errors;
            const successPercent = (goodCalls / stats.number_of_calls) * 100;
            const niceExecTime = getNiceDuration(stats.total_exec_time / stats.number_of_calls);
            return html`
                <div className="-runStatsBar">
                    <div className="-stat -calls">
                        <i class="fa fa-share"></i> ${stats.number_of_calls}
                    </div>
                    <div className="-stat -success">
                        <i class="fa fa-check"></i> ${successPercent.toPrecision(3)}%
                    </div>
                    <div className="-stat -run-time">
                        <i class="fa fa-clock-o"></i> ${niceExecTime}
                    </div>
                </div>
            `;
        }

        renderStatsBar() {
            return html`
                <div className="-statsBar">
                   <div className="-favoritesStar">${this.renderStar()}</div>
                   <div className="-releaseTags">${this.renderReleaseTagsDiv()}</div>
                   <div className="-runStats">${this.renderRunStats()}</div>
                </div>
            `;
        }

        renderScreenshotsModal() {
            return html`
                <div class="modal fade" id="screenshots-modal" tabindex="-1" role="dialog" aria-labelledby="screenshots-modal-label">
                    <div class="modal-dialog" style=${{width: '90%'}} role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true"><span className="fa fa-times" /></span></button>
                                <h4 class="modal-title" id="screenshots-modal-label">Screenshots</h4>
                            </div>
                            <div class="modal-body">
                                ${this.renderScreenshotCarousel()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        renderScreenshotCarousel() {
            const appFullInfo = this.props.appState.appFullInfo;
            const indicators = appFullInfo.screenshots.map((shot, index) => {
                return html`
                    <li data-target="carousel-screenshots" key=${index} data-slide-to="0" className=${index === 0 ? 'active' : ''}></li>
                `;
            });
            const slides = appFullInfo.screenshots.map((shot, index) => {
                const slideClass = ['item'];
                if (index === 0) {
                    slideClass.push('active');
                }

                return html`
                    <div className=${slideClass.join(' ')}>
                        <img src=${`${this.props.nms_image_url}/${shot.url}`}  className="-image" alt=${`Screenshot # ${index}`} />
                       
                    </div>
                `;
            });

            return html`
            <div id="carousel-screenshots" class="carousel slide" data-ride="carousel" data-interval="false">
                <ol class="carousel-indicators">
                    ${indicators}
                </ol>

                <div class="carousel-inner" role="listbox">
                    ${slides}
                </div>

            </div>
            `;
        }

        showScreenshotsModal(screenshotNumber) {
            jquery('#carousel-screenshots').carousel(screenshotNumber);
            jquery('#screenshots-modal').modal({
                show: true
            });
        }

        renderScreenshots() {
            const appFullInfo = this.props.appState.appFullInfo;
            if (!appFullInfo.screenshots || !appFullInfo.screenshots.length) {
                return;
            }

            const content = appFullInfo.screenshots.map((shot, index) => {
                return html`
                    <img src=${`${this.props.nms_image_url}/${shot.url}`} onclick=${() => {this.showScreenshotsModal(index);}}/>
                `;
            });
            return html`
                <div className="-screenshots">
                    ${content}
                    ${this.renderScreenshotsModal()}
                </div>
            `;
        }

        renderDescription() {
            const description = this.props.appState.appFullInfo.description;
            const re = /For questions.{0,50}<a href="mailto:help@kbase.us".{1,50}help@kbase.us.{0,5}<\/a>/g;
            const fixedDescrption = description.replace(
                re,
                'Questions? Suggestions? Bug reports? Please <a href="https://www.kbase.us/support/" target="_blank">contact us</a> and include the app name and error message (if any).'
            );
            return html`
                <div className="-description"
                     dangerouslySetInnerHTML=${{__html: DOMPurify.sanitize(fixedDescrption)}} 
                />
            `;
        }

        renderPublicationsSection() {
            const appFullInfo = this.props.appState.appFullInfo;
            if (!appFullInfo.publications || appFullInfo.publications.length === 0) {
                return;
            }
            const publications = appFullInfo.publications.map(({display_text, link}) => {
                return html`
                    <div className="-publication">
                        <div className="-display-text">${display_text}</div>
                        <div className="-link">
                            <a href="${link}" target="_blank">${link}</a>
                        </div>
                    </div>
                `;
            });
            return html`
                <div className="-publications">
                  <div className="-title">Related Publications</div>
                  ${publications}
                </div>
                
            `;
        }

        renderKBaseContributorsSection() {
            const appFullInfo = this.props.appState.appFullInfo;
            if (!appFullInfo.kb_contributors || appFullInfo.kb_contributors.length === 0) {
                return;
            }
            const contributors = appFullInfo.kb_contributors.map((contributor) => {
                return html`
                    <li>${contributor}</li>
                `;
            });
            return html`
            <div className="-section">
                <ul>
                    ${contributors}
                </ul>
            </div>
            `;
        }

        renderParameterGroup(parameters) {
            if (parameters.length === 0) {
                return html`
                    <div className="-none-available">none</div>
                `;
            }
            return parameters.map((parameter) => {
                const types = (() => {
                    if (parameter.text_options && parameter.text_options.valid_ws_types) {
                        return parameter.text_options.valid_ws_types.map((typeName) => {
                            const url_prefix = typeName.includes('.') ? 'type' : 'module';
                            return html`<${EuropaKBaseUILink} 
                                hash="spec/${url_prefix}/${typeName}"
                                newWindow=${true}
                            >${typeName}</>`;
                        });
                    }
                    return [];
                })();
                // const shortHint = (() => {
                //     if (parameter.short_hint.trim() === parameter.description.trim()) {
                //         return parameter.short_hint;
                //     }
                //     return html
                // })();
                // let description = parameter.short_hint;
                const description = (() => {
                    if (parameter.short_hint.trim() !== parameter.description.trim()) {
                        return html`
                        <div className="-description">
                            ${parameter.description }
                        </div>
                        `;
                    }
                })();

                return html`
                    <div className="-parameter">
                        <div className="-title">
                            <span dangerouslySetInnerHTML=${{__html: DOMPurify.sanitize(parameter.ui_name)}} 
                                  style=${{marginRight: '0.5em'}} />
                            ${interpolate(types, html`<span>, </span>`)}
                        </div>
                        <div className="-short-hint"> 
                            ${parameter.short_hint}
                        </div>
                        ${description}
                    </div>
                `;
            });
        }

        renderParameters() {
            const appSpec = this.props.appState.appSpec;

            if (!appSpec.parameters || appSpec.parameters.length === 0) {
                return html`
                    <div>No parameters</div>
                `;
            }

            const sortedParams = {
                inputs: [],
                outputs: [],
                parameters: []
            };

            for (const parameter of appSpec.parameters) {
                switch (parameter.ui_class) {
                case 'input':
                    sortedParams.inputs.push(parameter);
                    break;
                case 'output':
                    sortedParams.outputs.push(parameter);
                    break;
                default:
                    sortedParams.parameters.push(parameter);
                    break;
                }
            }

            const fixedParameters = (() => {
                if (!appSpec.fixed_parameters || appSpec.fixed_parameters.length === 0) {
                    return;
                }
                return html`
                    <div className="-parameterGroup">
                        <h4 className="-title">Fixed Parameters</h4>
                        <div className="-body">
                            ${this.renderParameterGroup(appSpec.fixed_parameters)}
                        </div>
                    </div>
                `;
            })();

            return html`
            <div className="-parameters">
                <div className="-parameterGroup">
                    <h4 className="-title">Inputs</h4>
                    <div className="-body">
                        ${this.renderParameterGroup(sortedParams.inputs)}
                    </div>
                </div>
                <div className="-parameterGroup">
                    <h4 className="-title">Outputs</h4>
                    <div className="-body">
                        ${this.renderParameterGroup(sortedParams.outputs)}
                    </div>
                </div>
                <div className="-parameterGroup">
                    <h4 className="-title">Parameters</h4>
                    <div className="-body">
                        ${this.renderParameterGroup(sortedParams.parameters)}
                    </div>
                </div>
                ${fixedParameters}
            </div>
        `;
        }

        renderAppInfo() {
            const info = this.props.appState.moduleDetails.info;
            if (!info) {
                return;
            }
            if (this.isGithub) {
                const url = `${info.git_url}/tree/${info.git_commit_hash}/ui/narrative/methods/${this.props.id}`;
                return html`
                    <div className="-app-info -section">
                        <div>
                            <div>App Specification:</div>
                            <div><a href="${url}" target="_blank">${url}</a></div>
                        </div>
                        <div>
                            <div>Module Commit:</div>
                            <div>${info.git_commit_hash}</div>
                        </div>
                    </div>
                `;
            }
            return html`
                <div className="-app-info -section">
                    <div>
                        <div>Git URL:</div>
                        <div><a href="${info.git_url}" target="_blank">${info.git_url}</a></div>
                    </div>
                    <div>
                        <div>Module Commit:</div>
                        <div>${info.git_commit_hash}</div>
                    </div>
                </div>
            `;

        }

        renderSubtitle() {
            return html`
                <div className="-subtitle">
                    ${this.props.appState.appFullInfo.subtitle}
                </div>
            `;
        }

        render() {
            return html`
                <div className="CatalogAppViewer">
                <${BackToCatalogLink} runtime=${this.props.runtime} />
                <div className="-header">
                        <div className="-title-bar">
                            <div className="-logo">
                                ${this.renderLogo()}
                            </div>
                            <div className="-title-area">
                                <div className="-title">${this.renderTitle()}</div>
                                <div className="-module">${this.renderModule()}</div>
                                <div className="-authors">${this.renderAuthors()}</div>
                            </div>
                        </div>
                        <div className="-stats-bar">
                            ${this.renderStatsBar()}
                        </div>
                </div>
                <div className="-section -subheader">
                    ${this.renderSubtitle()}
                    ${this.renderScreenshots()}
                </div>
                <div className="-body">
                        <div className="-section">
                            ${this.renderDescription()}
                        </div>
                        <div className="-section">
                            ${this.renderParameters()}
                        </div>
                        ${this.renderPublicationsSection()}
                        ${this.renderKBaseContributorsSection()}
                        ${this.renderAppInfo()}
                </div>
                </div>
            `;
        }
    }

    return CatalogAppViewer;
});