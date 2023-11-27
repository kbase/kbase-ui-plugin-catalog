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

    class KBaseUILink extends Component {
        render() {
            const url = kbaseUIURL(this.props.hash, this.props.params);
            return html`<a href=${url} target="_parent">
                ${this.props.children}
            </a>`;
        }
    }

    return KBaseUILink;
});