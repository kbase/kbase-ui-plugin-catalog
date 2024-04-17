define([
    'preact',
    'htm',
    'europaSupport'
], (
    preact,
    htm,
    {kbaseUIURL}
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class CatalogLink extends Component {
        render() {
            const url = kbaseUIURL(`catalog/${this.props.path}`).toString();
            return html`<a href=${url} target="_parent">
                ${this.props.children}
            </a>`;
        }
    }

    return CatalogLink;
});