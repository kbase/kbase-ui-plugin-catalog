define([
], (
) => {
    function basePath() {
        const path = window.location.pathname;
        const basePath = path.split('/')[1];
        return `/${basePath}`;
    }

    return {basePath};
});