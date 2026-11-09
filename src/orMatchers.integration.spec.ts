import axios from 'axios';

import fs = require('node:fs');
import path = require('node:path');

import { MatchersV3 } from './v3';
import { PactV4 } from './v4';

const { anyOf, integer, likeOrNull, nullValue, regex, string, uuid } =
  MatchersV3;

// Requires a version of the Pact FFI that supports `pact:matcher:combine`
// (pact-foundation/pact-reference#601)
describe('Matchers combined with OR', () => {
  const pactFilePath = path.resolve(
    process.cwd(),
    'pacts',
    'or-matcher-consumer-or-matcher-provider.json',
  );
  const description = 'a request to create a user with optional fields';
  const id = 'e2490de5-5bd3-43d5-b7c4-526e33f71304';

  type Address = { street: string; number: unknown } | null;
  type RequestOptions = {
    name?: unknown;
    address?: Address;
    query?: string;
    header?: string;
  };

  const executeRequest = ({
    name = 'Fred',
    address = { street: 'Main St', number: 42 },
    query = '42',
    header = '42',
  }: RequestOptions = {}) =>
    new PactV4({
      consumer: 'or-matcher-consumer',
      provider: 'or-matcher-provider',
    })
      .addInteraction()
      .uponReceiving(description)
      .withRequest('POST', '/users', (builder) => {
        builder
          .query({ id: anyOf(regex(/^\d+$/, '42'), uuid(id)) })
          .headers({ 'x-request-id': anyOf(regex(/^\d+$/, '42'), uuid(id)) })
          .jsonBody({
            name: anyOf(string('Fred'), nullValue()),
            address: likeOrNull({
              street: string('Main St'),
              number: integer(42),
            }),
          });
      })
      .willRespondWith(201, (builder) => {
        builder.jsonBody({ name: anyOf(string('Fred'), nullValue()) });
      })
      .executeTest(async (server) => {
        const res = await axios.post(
          `${server.url}/users`,
          { name, address },
          {
            params: { id: query },
            headers: { 'x-request-id': header },
            validateStatus: () => true,
          },
        );
        return res;
      });

  beforeAll(() => {
    if (fs.existsSync(pactFilePath)) {
      fs.unlinkSync(pactFilePath);
    }
  });

  it('matches the example values, and returns the example from the first matcher', async () => {
    const res = await executeRequest();
    expect(res?.status).toEqual(201);
    expect(res?.data).toEqual({ name: 'Fred' });
  });

  it('matches the other alternatives', async () => {
    const res = await executeRequest({
      name: null,
      address: null,
      query: id,
      header: id,
    });
    expect(res?.status).toEqual(201);
  });

  it('applies the matchers nested in the example of an optional object', async () => {
    await expect(
      executeRequest({ address: { street: 'Other St', number: 7 } }),
    ).resolves.toBeDefined();
    await expect(
      executeRequest({ address: { street: 'Main St', number: '42' } }),
    ).rejects.toThrow(/Test failed/);
  });

  it('fails when the body value matches none of the alternatives', async () => {
    await expect(executeRequest({ name: 123 })).rejects.toThrow(/Test failed/);
  });

  it('fails when a header matches none of the alternatives', async () => {
    await expect(executeRequest({ header: 'abc' })).rejects.toThrow(
      /Test failed/,
    );
  });

  it('fails when a query parameter matches none of the alternatives', async () => {
    await expect(executeRequest({ query: 'abc' })).rejects.toThrow(
      /Test failed/,
    );
  });

  it('writes the rules combined with OR to the pact file', () => {
    const pact = JSON.parse(fs.readFileSync(pactFilePath, 'utf8'));
    const interaction = pact.interactions.find(
      (i: { description: string }) => i.description === description,
    );
    const requestRules = interaction.request.matchingRules;
    const orRegexOrUuid = {
      combine: 'OR',
      matchers: [
        { match: 'regex', regex: '^\\d+$' },
        {
          match: 'regex',
          regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        },
      ],
    };

    expect(requestRules.body['$.name']).toEqual({
      combine: 'OR',
      matchers: [{ match: 'type' }, { match: 'null' }],
    });
    expect(requestRules.body['$.address']).toEqual({
      combine: 'OR',
      matchers: [{ match: 'type' }, { match: 'null' }],
    });
    expect(requestRules.body['$.address.number']).toEqual({
      combine: 'AND',
      matchers: [{ match: 'integer' }],
    });
    expect(requestRules.header['x-request-id']).toEqual(orRegexOrUuid);
    expect(requestRules.query.id).toEqual(orRegexOrUuid);
    expect(interaction.response.matchingRules.body['$.name']).toEqual({
      combine: 'OR',
      matchers: [{ match: 'type' }, { match: 'null' }],
    });
  });
});
