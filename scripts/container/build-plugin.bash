cd build
npm install && \
npm run clean && \
npm install && \
npm run install-bower && \
npm run install-npm && \
npm run remove-source-maps && \
npm run install-dist
cd ..