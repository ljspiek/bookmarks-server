const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { bookmarks } = require('../store')
const bookmarksRouter = express.Router()
const bodyParser = express.json()
const xss = require('xss')
const BookmarksService = require('../bookmarks-service')

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks.map(bookmark => ({
                id: bookmark.id,
                title: xss(bookmark.title),
                bookmark_url: xss(bookmark.bookmark_url),
                descr: xss(bookmark.descr),
                rating: bookmark.rating
            })))
        }) 
        .catch(next)
    })
    .post(bodyParser, (req, res, next) => {
        for(const field of ['title', 'bookmark_url', 'rating']) {
            if(!req.body[field]) {
                logger.error(`${field} is required`)
                return res.status(400).send({
                    error: { message: `Missing '${field}' in request body`}
                })
            }
        }

        const { title, bookmark_url, descr, rating } = req.body;
        const newBookmark = { title, bookmark_url, descr, rating }

        const ratingNum = Number(rating)

        if(!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
            logger.error(`Invalid rating '${rating}' supplied`)
            return res.status(400).send({
                error: {
                    message: `'rating' must be a number between 0 and 5`
                }
            })
        }

        // for(const [key, value] of Object.entries(newBookmark)) {

        //     if(value == null) {
        //         return res.status(400).json({
        //             error: { message: `Missing '${key}' in request body`}
        //         })
        //     }

        // }


        BookmarksService.insertBookmarks(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json({
                        id: bookmark.id,
                        title: xss(bookmark.title),
                        bookmark_url: xss(bookmark.bookmark_url),
                        descr: xss(bookmark.descr),
                        rating: bookmark.rating
                    })
            })
            .catch(next)
    })

bookmarksRouter
    .route('/bookmarks/:bookmark_id')
    .all((req, res, next) => {
        const { bookmark_id } = req.params
        BookmarksService.getById(req.app.get('db'), bookmark_id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${bookmark_id} not found.`)
                    return res.status(404).json({
                        error: { message: `Bookmark Not Found` }
                    })
                }
                res.bookmark = bookmark
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        const{ bookmark_id } = req.params
        BookmarksService.getById(knexInstance, bookmark_id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${bookmark_id} not found`);
                    return res
                        .status(404).json({
                            error: { message: `Bookmark Not Found`}
                        })
                }
                res.json(bookmark);
            })
            .catch(next)
    })
    .delete((req, res, next) => {
        const { bookmark_id } = req.params
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            bookmark_id
        )
            .then(numRowsAffected => {
                logger.info(`Bookmark with id ${bookmark_id} deleted.`)
                res.status(204).end()
            })
            .catch(next)

    })

module.exports = bookmarksRouter