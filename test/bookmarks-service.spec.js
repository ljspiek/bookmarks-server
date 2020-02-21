const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')


describe.only('Bookmarks Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clear the table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe(`Unauthorized requests`, () => {
        it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
            return supertest(app)
            .get('/api/bookmarks')
            .expect(401, { error: 'Unauthorized request' })
        })

        it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
            return supertest(app)
            .post('/api/bookmarks')
            .send({ title: 'test-title', bookmark_url: 'http://some.thing.com', rating: 1 })
            .expect(401, { error: 'Unauthorized request' })
        })

        it(`responds with 401 Unauthorized for GET /api/bookmarks/:id`, () => {
            const bookmarkId = 2
            return supertest(app)
                .get(`/api/bookmarks/${bookmarkId}`)
                .expect(401, { error: 'Unauthorized request' })
        })

        it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:id`, () => {
            const bookmarkId = 1
            return supertest(app)
                .delete(`/api/bookmarks/${bookmarkId}`)
                .expect(401, { error: 'Unauthorized request' })
        })
    })

    describe(`GET /api/bookmarks`, () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /api/bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })

        context('Given no bookmarks', () => {
            it(`GET /api/bookmarks responds with 200 and an empty array`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })
    })

    describe(`GET /api/bookmarks/:bookmark_id`, () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                .into('bookmarks')
                .insert(testBookmarks)
            })

            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookMark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                .get(`/api/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, expectedBookMark)
            })
        })

        context('Given no bookmarks', () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark Not Found` }})
            })
            
        })
    })

    describe(`POST /api/bookmarks`, () => {
        it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
            const newBookmark = {
                title: 'Test new bookmark',
                bookmark_url: 'www.test.testing.com',
                descr: 'Testing new bookmark!!',
                rating: 3
            }
            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.bookmark_url).to.eql(newBookmark.bookmark_url)
                    expect(res.body.desc).to.eql(newBookmark.desc)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                    )

        })

        const requiredFields = ['title', 'bookmark_url', 'rating']

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test new bookmark',
                bookmark_url: 'www.testing.com',
                descr: 'Here is a test',
                rating: '4'
            }

            it(`responds with 400 and an error message when the ${field} is missing`, () => {
                delete newBookmark[field]

                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body`}
                    })
            })

            it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
                const newBookmarkInvalidRating = {
                    title: 'test-title',
                    bookmark_url: 'www.test.com',
                    descr: 'testing invalid rating',
                    rating: 'invalid',
                }

                return supertest(app)
                    .post(`/api/bookmarks`)
                    .send(newBookmarkInvalidRating)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(400, {
                        error: { message: `'rating' must be a number between 0 and 5`}
                    })
            })

        })
        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
            return supertest(app)
                .post(`/api/bookmarks`)
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.descr).to.eql(expectedBookmark.descr)
                })
        })
    })

    describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 1
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                        )
            })
        })

        context(`Given no bookmarks`, () => {
            it(`responds with 404 when bookmark doesn't exist`, () => {
                return supertest(app)
                    .delete(`/api/bookmarks/1234456`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Bookmark Not Found` }
                    })
            })
        })
    })

    describe(`PATCH /api/bookmarks/:bookmarks_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark Not Found`}})
            })
        })

        context(`Given there are articles in the database`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            
            it('responds with 204 and updates the bookmarks', () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                    bookmark_url: 'www.updated.com',
                    descr: 'update, update, update!',
                    rating: '2',
                }

                const expectedBookMark = {
                    ...testBookmarks[idToUpdate -1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(expectedBookMark)
            })
        })
    })


})