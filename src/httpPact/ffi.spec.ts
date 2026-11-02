import type { ConsumerInteraction } from '@pact-foundation/pact-core';
import { vi } from 'vitest';
import { term } from '../dsl/matchers';
import { contentTypeFromHeaders, setQuery } from './ffi';

describe('Pact FFI', () => {
  describe('#contentTypeFromHeaders', () => {
    ['content-type', 'Content-Type', 'CONTent-TYPE'].forEach((t) => {
      describe(`when the "${t}" header is set`, () => {
        it('detects the content type from the header', () => {
          const headers = { [t]: 'some-mime-type' };
          expect(contentTypeFromHeaders(headers, 'application/json')).toBe(
            'some-mime-type',
          );
        });
      });
    });

    describe('when the header is a matcher', () => {
      it('uses the example value', () => {
        const headers = {
          'Content-Type': term({
            generate: 'application/json',
            matcher: 'application/json.*',
          }),
        };
        expect(contentTypeFromHeaders(headers, 'text/plain')).toBe(
          'application/json',
        );
      });
    });

    describe('when the header has more than one value', () => {
      it('uses the first value', () => {
        const headers = {
          'Content-Type': [
            term({ generate: 'application/xml', matcher: 'application/.*xml' }),
            'text/plain',
          ],
        };
        expect(contentTypeFromHeaders(headers, 'application/json')).toBe(
          'application/xml',
        );
      });
    });

    describe(`when the no content-type header is set`, () => {
      it('uses a default', () => {
        expect(contentTypeFromHeaders({}, 'application/json')).toBe(
          'application/json',
        );
      });
    });
  });

  describe('#setQuery', () => {
    describe('with array values', () => {
      it('calls the query ffi function for each value', () => {
        const queryMock = vi.fn();

        const interaction = {
          withQuery: queryMock,
        } as unknown as ConsumerInteraction;
        const query = {
          foo: ['bar', 'baz'],
        };
        setQuery(interaction, query);
        expect(queryMock).toHaveBeenCalledTimes(2);
        expect(queryMock).toHaveBeenCalledWith('foo', 0, 'bar');
        expect(queryMock).toHaveBeenCalledWith('foo', 1, 'baz');
      });
    });

    describe('with single values', () => {
      it('calls the query ffi function for each value', () => {
        const queryMock = vi.fn();

        const interaction = {
          withQuery: queryMock,
        } as unknown as ConsumerInteraction;
        const query = {
          foo: 'bar',
        };
        setQuery(interaction, query);
        expect(queryMock).toHaveBeenCalledOnce();
        expect(queryMock).toHaveBeenCalledWith('foo', 0, 'bar');
      });
    });

    describe('with array and single values', () => {
      it('calls the query ffi function for each value', () => {
        const queryMock = vi.fn();

        const interaction = {
          withQuery: queryMock,
        } as unknown as ConsumerInteraction;
        const query = {
          foo: 'bar',
          baz: ['bat', 'foo'],
        };
        setQuery(interaction, query);
        expect(queryMock).toHaveBeenCalledTimes(3);
        expect(queryMock).toHaveBeenCalledWith('foo', 0, 'bar');
        expect(queryMock).toHaveBeenCalledWith('baz', 0, 'bat');
        expect(queryMock).toHaveBeenCalledWith('baz', 1, 'foo');
      });
    });
  });
});
