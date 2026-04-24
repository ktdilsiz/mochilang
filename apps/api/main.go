package main

import (
    "log"
    "github.com/gin-gonic/gin"
    _ "modernc.org/sqlite"
    "github.com/jmoiron/sqlx"
)

func main() {
    db, err := sqlx.Open("sqlite", "./app.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    r := gin.Default()
    r.GET("/api/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    log.Fatal(r.Run(":8080"))
}