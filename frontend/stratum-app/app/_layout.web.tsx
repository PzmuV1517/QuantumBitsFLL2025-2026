import './globals.css';
// Explicitly import the non-web layout to avoid a platform resolution cycle
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layout = require('./_layout.tsx').default;
export default Layout;
