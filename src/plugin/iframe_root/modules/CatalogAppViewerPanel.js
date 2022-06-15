define([
    'preact',
    'htm',
    'components/CatalogAppViewer/CatalogAppViewerLoader'
], (
    preact,
    htm,
    CatalogAppViewerLoader
) => {
    const html = htm.bind(preact.h);

    class CatalogAppViewerPanel {
        constructor({runtime}) {
            this.runtime = runtime;
            this.root = null;
            this.container = null;
        }

        attach(node) {
            this.root = node;
            this.container = node.appendChild(document.createElement('div'));
        }
        start(params) {
            this.runtime.send('ui', 'setTitle', 'Catalog App Viewer');
            const {namespace, id, tag} = params;
            const content = html`
                <${CatalogAppViewerLoader} 
                    runtime=${this.runtime} 
                    namespace=${namespace} 
                    id=${id}
                    tag=${tag} />
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

    return CatalogAppViewerPanel;
});