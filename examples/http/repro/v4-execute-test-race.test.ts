import path from 'node:path';
import {
  type LogLevel,
  Matchers,
  Pact,
  SpecificationVersion,
} from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { UserServiceClient } from '../consumer';

const { integer, like } = Matchers;

const INTERACTION_COUNT = Number(process.env.REPRO_INTERACTIONS ?? 50);

describe('V4 executeTest race repro under load', () => {
  const pact = new Pact({
    consumer: 'UserConsumerV4RaceRepro',
    provider: 'UserProviderV4RaceRepro',
    spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: (process.env.LOG_LEVEL as LogLevel) ?? 'warn',
  });

  it(
    `runs ${INTERACTION_COUNT} sequential executeTest() calls in one file`,
    async () => {
      for (let index = 1; index <= INTERACTION_COUNT; index += 1) {
        const userId = index;

        await pact
          .addInteraction()
          .given(`a user with ID ${userId} exists`)
          .uponReceiving(
            `repro interaction ${index}: GET /users/${userId} should be tracked`,
          )
          .withRequest('GET', `/users/${userId}`, (builder) => {
            builder.headers({ Accept: 'application/json' });
          })
          .willRespondWith(200, (builder) => {
            builder.headers({ 'Content-Type': 'application/json' });
            builder.jsonBody(
              like({
                id: integer(userId),
                name: like(`User ${userId}`),
                email: like(`user-${userId}@example.com`),
              }),
            );
          })
          .executeTest(async (mockServer) => {
            const client = new UserServiceClient(mockServer.url);
            const user = await client.getUser(userId);

            expect(user.id).toBe(userId);
            expect(user.name).toBe(`User ${userId}`);
            expect(user.email).toBe(`user-${userId}@example.com`);
          });
      }
    },
    Number(process.env.REPRO_TIMEOUT_MS ?? 120000),
  );
});
