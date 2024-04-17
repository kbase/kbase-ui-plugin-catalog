cd build
npm ci && \
npm run install-bower && \
npm run install-npm && \
npm run remove-source-maps && \
npm run install-dist
cd ..