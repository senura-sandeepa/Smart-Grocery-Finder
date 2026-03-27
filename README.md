# 🛒 Smart Grocery Finder

![CI](https://github.com/senura-sandeepa/Smart-Grocery-Finder/actions/workflows/ci.yml/badge.svg)

A coordinate-based grocery shop recommendation engine built with Spring Boot.

---

## 🚀 Live Demo
🌐 Coming soon (Railway deployment)

---

## ✨ Features

- 🔍 **Basic Recommendation** — Finds the single best shop that covers most of your grocery items
- 🗺️ **Advanced Multi-Shop Route** — Greedy nearest-neighbour algorithm to find the shortest travel route across multiple shops
- 📍 **Real-time SVG Map** — Interactive coordinate map showing your position and recommended route
- ✅ **12 Automated Tests** — Unit and integration tests using JUnit 5 and Mockito

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2 |
| Database | MySQL, JPA/Hibernate, Flyway |
| Frontend | Vanilla JavaScript, HTML, CSS |
| Testing | JUnit 5, Mockito |
| DevOps | Docker, GitHub Actions |

---

## 📐 Algorithm

### Basic (`POST /recommend`)
Finds the **single best shop** by:
1. Counting how many requested items each shop has
2. Returning the shop with the most matches
3. Using distance as a tiebreaker

### Advanced (`POST /recommend/advanced`)
Finds the **optimal multi-shop route** using greedy nearest-neighbour:
1. From current position, find the nearest shop that has any needed items
2. Visit that shop, collect items, update position
3. Repeat until all items are found
4. Returns ordered list of shops with distances

---

## 🗄️ Database Schema
```
shops          items          shop_items
─────────      ──────         ──────────────
id             id             shop_id (FK)
name           name           item_id (FK)
x_coordinate
y_coordinate
```

---

## 🚦 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/items` | Create a new item |
| GET | `/items` | Get all items |
| DELETE | `/items/{id}` | Delete an item |
| POST | `/shops` | Create a new shop |
| GET | `/shops` | Get all shops |
| POST | `/shops/{shopId}/items/{itemId}` | Assign item to shop |
| POST | `/recommend` | Basic recommendation |
| POST | `/recommend/advanced` | Advanced multi-shop route |

---

## ▶️ Run Locally

### Option 1 — Docker (Recommended)
```bash
docker-compose up --build
```
App runs at `http://localhost:8080` ✅

### Option 2 — Manual
**Prerequisites:** Java 17, MySQL

1. Clone the repo
```bash
git clone https://github.com/senura-sandeepa/Smart-Grocery-Finder.git
```

2. Update `application.yml` with your MySQL credentials

3. Run
```bash
./mvnw spring-boot:run
```

---

## 🧪 Run Tests
```bash
./mvnw test
```
```
Tests run: 12, Failures: 0, Errors: 0 ✅
```

---

## 📸 Screenshots

> Add screenshots of your UI here after deployment

---

## 👨‍💻 Author
**Senura** — [GitHub](https://github.com/senura-sandeepa)
