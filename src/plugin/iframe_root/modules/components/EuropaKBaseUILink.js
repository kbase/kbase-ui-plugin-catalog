define([
    'preact',
    'htm',
    'europaSupport'
], (
    preact,
    htm,
    {otherUIURL}
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class EuropaKBaseUILink extends Component {
        render() {
            const url = otherUIURL({hash: this.props.hash}).toString();
            const target = this.props.newWindow ? '_blank': '_top';
            return html`<a href=${url} target=${target}>
                ${this.props.children}
            </a>`;
        }
    }

    return EuropaKBaseUILink;
});