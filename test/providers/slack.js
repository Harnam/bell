'use strict';

// Load modules

const Bell = require('../../');
const Code = require('code');
const Hapi = require('hapi');
const Hoek = require('hoek');
const Lab = require('lab');
const Mock = require('../mock');


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('slack', () => {

    it('authenticates with mock', { parallel: false }, (done) => {

        const mock = new Mock.V2();
        mock.start((provider) => {

            const server = new Hapi.Server();
            server.connection({ host: 'localhost', port: 80 });
            server.register(Bell, (err) => {

                expect(err).to.not.exist();

                const custom = Bell.providers.slack();
                Hoek.merge(custom, provider);

                const profile = {
                    ok: true,
                    url: 'https:\/\/example.slack.com\/',
                    team: 'Example',
                    user: 'cal',
                    team_id: 'T12345',
                    user_id: 'U12345'
                };

                Mock.override('https://slack.com/api/auth.test', profile);

                server.auth.strategy('custom', 'bell', {
                    password: 'cookie_encryption_password_secure',
                    isSecure: false,
                    clientId: 'slack',
                    clientSecret: 'secret',
                    provider: custom
                });

                server.route({
                    method: '*',
                    path: '/login',
                    config: {
                        auth: 'custom',
                        handler: function (request, reply) {

                            reply(request.auth.credentials);
                        }
                    }
                });

                server.inject('/login', (res) => {

                    const cookie = res.headers['set-cookie'][0].split(';')[0] + ';';
                    mock.server.inject(res.headers.location, (mockRes) => {

                        server.inject({ url: mockRes.headers.location, headers: { cookie } }, (response) => {

                            Mock.clear();
                            expect(response.result).to.equal({
                                provider: 'custom',
                                token: '456',
                                refreshToken: undefined,
                                expiresIn: 3600,
                                query: {},
                                profile: {
                                    access_token: '456',
                                    scope: undefined,
                                    user: 'cal',
                                    user_id: 'U12345',
                                    raw: profile
                                }
                            });
                            mock.stop(done);
                        });
                    });
                });
            });
        });
    });

    it('authenticates with mock (without extended profile)', { parallel: false }, (done) => {

        const mock = new Mock.V2();
        mock.start((provider) => {

            const server = new Hapi.Server();
            server.connection({ host: 'localhost', port: 80 });
            server.register(Bell, (err) => {

                expect(err).to.not.exist();

                const custom = Bell.providers.slack({ extendedProfile: false });
                Hoek.merge(custom, provider);

                server.auth.strategy('custom', 'bell', {
                    password: 'cookie_encryption_password_secure',
                    isSecure: false,
                    clientId: 'slack',
                    clientSecret: 'secret',
                    provider: custom
                });

                server.route({
                    method: '*',
                    path: '/login',
                    config: {
                        auth: 'custom',
                        handler: function (request, reply) {

                            reply(request.auth.credentials);
                        }
                    }
                });

                server.inject('/login', (res) => {

                    const cookie = res.headers['set-cookie'][0].split(';')[0] + ';';
                    mock.server.inject(res.headers.location, (mockRes) => {

                        server.inject({ url: mockRes.headers.location, headers: { cookie } }, (response) => {

                            expect(response.result).to.equal({
                                provider: 'custom',
                                token: '456',
                                refreshToken: undefined,
                                expiresIn: 3600,
                                query: {},
                                profile: {
                                    scope: undefined,
                                    access_token: '456'
                                }
                            });

                            mock.stop(done);
                        });
                    });
                });
            });
        });
    });
});
