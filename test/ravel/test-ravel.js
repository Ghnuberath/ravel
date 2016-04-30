'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
const upath = require('upath');
const redis = require('redis-mock');
const request = require('supertest');

let app, agent;

const u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];


describe('Ravel end-to-end test', function() {
  before(function(done) {
    done();
  });

  after(function(done) {
    done();
  });

  describe('#init()', function() {
    describe('basic application server consisting of a module and a resource', function() {
      before(function(done) {
        //enable mockery
        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });

        const Ravel = require('../../lib/ravel');
        const httpCodes = require('../../lib/util/http_codes');
        const ApplicationError = require('../../lib/util/application_error');
        const inject = Ravel.inject;

        //stub Module (business logic container)
        @inject('$E')
        class Users extends Ravel.Module {
          constructor($E) {
            super();
            this.$E = $E;
          }

          getAllUsers() {
            expect(this).to.have.a.property('params').that.is.an('object');
            return Promise.resolve(u);
          }

          getUser(userId) {
            if (userId < u.length) {
              return Promise.resolve(u[userId-1]);
            } else {
              return Promise.reject(new this.$E.NotFound('User id=' + userId + ' does not exist!'));
            }
          }
        }

        //stub Resource (REST interface)
        const pre = Ravel.Resource.before;  //have to alias to @pre instead of proper @before, since the latter clashes with mocha
        @inject('users', '$E')
        class UsersResource extends Ravel.Resource {
          constructor(users, $E) {
            super('/api/user');
            this.users = users;
            this.$E = $E;
          }

          @pre('respond')
          getAll(ctx) {
            expect(this).to.have.a.property('params').that.is.an('object');
            return this.users.getAllUsers()
            .then((list) => {
              ctx.body = list;
            });
          }

          @pre('respond')
          get(ctx) {
            // return promise and don't catch possible error so that Ravel can catch it
            return this.users.getUser(ctx.params.id)
            .then((result) => {
              ctx.body = result;
            });
          }
        }

        //stub Routes (miscellaneous routes, such as templated HTML content)
        const mapping = Ravel.Routes.mapping;
        class TestRoutes extends Ravel.Routes {
          constructor() {
            super('/');
          }

          @mapping(Ravel.Routes.GET, '/app')
          appHandler(ctx) {
            expect(this).to.have.a.property('params').that.is.an('object');
            ctx.body = '<!DOCTYPE html><html></html>';
            ctx.status = 200;
          }

          @mapping(Ravel.Routes.GET, '/login')
          loginHandler(ctx) {
            return Promise.resolve().then(() => {
              ctx.body = '<!DOCTYPE html><html><head><title>login</title></head></html>';
              ctx.status = 200;
            });
          }
        }

        mockery.registerMock('redis', redis);
        app = new Ravel();
        expect(Ravel).to.have.a.property('httpCodes').that.deep.equals(httpCodes);
        expect(Ravel).to.have.a.property('Error').that.deep.equals(ApplicationError.General);
        app.set('log level', app.Log.NONE);
        app.set('redis host', 'localhost');
        app.set('redis port', 5432);
        app.set('port', '9080');
        app.set('koa public directory', 'public');
        app.set('keygrip keys', ['mysecret']);

        mockery.registerMock(upath.join(app.cwd, 'users'), Users);
        app.module('users', 'users');
        mockery.registerMock(upath.join(app.cwd, 'usersResource'), UsersResource);
        app.resource('usersResource');
        mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
        app.routes('routes');
        app.init();

        agent = request.agent(app.server);
        done();
      });

      after(function(done) {
        app = undefined;
        mockery.deregisterAll();
        mockery.disable();
        done();
      });

      it('should respond with the list of registered users', function(done) {
        agent
        .get('/api/user')
        .expect(200, JSON.stringify(u))
        .end(done);
      });

      it('should respond with a single existing user', function(done) {
        agent
        .get('/api/user/1')
        .expect(200, JSON.stringify(u[0]))
        .end(done);
      });

      it('should respond with HTTP 404 NOT FOUND for non-existent users', function(done) {
        agent
        .get('/api/user/3')
        .expect(404)
        .end(done);
      });

      it('should respond with html on the route /app', function(done) {
        agent
        .get('/app')
        .expect(200, '<!DOCTYPE html><html></html>')
        .end(done);
      });

      it('should respond with html on the route /login', function(done) {
        agent
        .get('/login')
        .expect(200, '<!DOCTYPE html><html><head><title>login</title></head></html>')
        .end(done);
      });
    });
  });
});
