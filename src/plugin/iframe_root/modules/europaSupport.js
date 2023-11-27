define([], () => {

    function kbaseUIURL(hash, params) {
        const url = new URL(window.location.origin);
        url.hash = `#${hash}`;
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams(params);
            // Use our special notation for params on the hash
            url.hash += `$${searchParams}`;
        }
        return url;
    }

    function otherUIURL({hash, pathname, params}) {
        let hostname;
        if (!window.location.hostname.endsWith('kbase.us')) {
            hostname = 'ci.kbase.us';
        } else {
            hostname = window.location.hostname.split('.').slice(1).join('.');
        }
        const url = new URL(`https://${hostname}`);

        url.pathname = hash ? `legacy/${hash}` : pathname || '';

        // So in this case we use a standard search fragment.
        if (params && Object.keys(params).length > 0) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.set(key, value);
            }
        }

        return url;
    }

    /**
     * Create a URL for any KBase user interface.
     *
     * Uses specific heuristics for determining how to construct it:
     */
    function europaURL(hashPath, newWindow) {
        if (!newWindow && hashPath.hash) {
            return kbaseUIURL(hashPath.hash, hashPath.params);
        }

        return otherUIURL(hashPath);
    }

    return {kbaseUIURL, otherUIURL, europaURL};
});