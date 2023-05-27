const path = require('path');
const { Verifier } = require('@you54f/pact');
const { accountService } = require('./account-service');
const {
  Account,
  AccountNumber,
  accountRepository,
} = require('./account-repository');
const LOG_LEVEL = process.env.LOG_LEVEL || 'TRACE';

describe('Account Service', () => {
  let server;
  beforeAll(() => (server = accountService.listen(8081)));
  afterAll(() => {
    console.log('closing server!');
    server.close();
  });

  it('validates the expectations of Transaction Service', () => {
    let opts = {
      provider: 'Account Service',
      providerBaseUrl: 'http://localhost:8081',
      logLevel: LOG_LEVEL,
      stateHandlers: {
        'Account Test001 exists': {
          setup: (params) => {
            let account = new Account(
              0,
              0,
              'Test001',
              params.accountRef,
              new AccountNumber(0),
              Date.now(),
              Date.now()
            );
            let persistedAccount = accountRepository.save(account);
            return Promise.resolve({
              accountNumber: persistedAccount.accountNumber.id,
            });
          },
        },
        'set id': {
          setup: (params) => Promise.resolve({ id: params.id }),
        },
        'set path': {
          setup: (params) =>
            Promise.resolve({ id: params.id, path: params.path }),
        },
      },

      pactUrls: [
        path.resolve(
          process.cwd(),
          './pacts/TransactionService-AccountService.json'
        ),
      ],
    };

    return new Verifier(opts).verifyProvider();
  });
});
