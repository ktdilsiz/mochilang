FROM golang:1.26.2-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api .
RUN mkdir -p /app/data
EXPOSE 8080
CMD ["./api"]