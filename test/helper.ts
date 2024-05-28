import pact from '@you54f/pact-core';

// used to kill any left over mock server instances
process.on('SIGINT', () => {
  pact.removeAllServers();
});
