const express = require('express')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { bookmarks } = require('../store')
const bookmarksRouter = express.Router()
const bodyParser = express.json()
const BookmarksService = require('../bookmarks-service')

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks)
        }) 
        .catch(next)
    })
    .post(bodyParser, (req, res) => {
        const { title, url, desc, rating } = req.body;

        if(!title) {
            logger.error('Title is required');
            return res
                .status(400)
                .send('Invalid data');
        }

        if(!url) {
            logger.error('URL is required');
            return res
                .status(400)
                .send('Invalid data')
        }

        if(!rating) {
            logger.error('Rating is required');
            return res
                .status(400)
                .send('Invalid data')
        }

        const id = uuid();

        const bookmark = {
            id,
            title,
            url,
            desc,
            rating
        };

        bookmarks.push(bookmark);

        logger.info(`Bookmark with id ${id} created`);

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(bookmark)
    })

bookmarksRouter
    .route('/bookmarks/:bookmark_id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        const{ bookmark_id } = req.params
        BookmarksService.getById(knexInstance, bookmark_id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${bookmark_id} not found`);
                    return res
                        .status(404).json({
                            error: { message: `Bookmark doesn't exist`}
                        })
                }
                res.json(bookmark);
            })
            .catch(next)
    })
    .delete((req, res) => {
        const { id } = req.params;
        const bmIndex = bookmarks.findIndex(b => b.id == id);

        if(bmIndex === -1) {
            logger.error(`Bookmark with id ${id} not found`);
            return res 
                .status(404)
                .send('Not found');
        }

        bookmarks.splice(bmIndex, 1);

        logger.info(`Bookmark with id ${id} deleted`);
        res
            .status(204)
            .end();

    })

module.exports = bookmarksRouter