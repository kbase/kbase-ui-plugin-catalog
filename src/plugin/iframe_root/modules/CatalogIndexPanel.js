define([
    'preact',
    'htm',
    'components/CatalogIndex/CatalogIndexLoader'
], (
    preact,
    htm,
    CatalogIndex
) => {
    const html = htm.bind(preact.h);

    class CatalogIndexPanel {
        constructor({runtime}) {
            this.runtime = runtime;
            this.root = null;
            this.container = null;
        }

        attach(node) {
            this.root = node;
            this.container = node.appendChild(document.createElement('div'));
        }
        start() {
            this.runtime.send('ui', 'setTitle', 'Catalog Index');
            const content = html`
                <${CatalogIndex} runtime=${this.runtime} />
            `;
            preact.render(content, this.container);
        }

        stop() {
        }

        detach() {
            if (this.container) {
                this.container.innerHTML = '';
                if (this.root && this.container.parentNode == this.root) {
                    this.root.removeChild(this.container);
                }
            }
        }
    }

    return CatalogIndexPanel;
});