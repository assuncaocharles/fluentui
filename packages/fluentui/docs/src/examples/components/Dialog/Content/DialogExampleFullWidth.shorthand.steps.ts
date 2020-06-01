import getScreenerSteps from '../commonScreenerSteps';

const config: ScreenerTestsConfig = {
  themes: ['teams'],
  steps: getScreenerSteps(),
  browsers: ['ie11'],
};

export default config;
