function makeBookmarksArray() {
    return [
        {
            "id": 1,
            "title": "Google",
            "bookmark_url": "http://google.com",
            "descr": "An indie search engine startup",
            "rating": 4
          },
          {
            "id": 2,
            "title": "Fluffiest Cats in the World",
            "bookmark_url": "http://medium.com/bloggerx/fluffiest-cats-334",
            "descr": "The only list of fluffy cats online",
            "rating": 5
          }
    ]
}

module.exports = { makeBookmarksArray }