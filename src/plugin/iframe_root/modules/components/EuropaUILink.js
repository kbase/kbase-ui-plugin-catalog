define([
    'preact',
    'htm',
], (
    preact,
    htm
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class EuropaUILink extends Component {
        render() {
            const url = `/#${this.props.path}`;
            const target = typeof this.props.newWindow === 'undefined' || this.props.newWindow ? '_blank': '_top';
            return html`<a href=${url} target=${target}>
                ${this.props.children}
            </a>`;
        }
    }

    return EuropaUILink;
});