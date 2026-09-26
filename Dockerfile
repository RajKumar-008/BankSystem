# ===================================================
# Dockerfile — used by Render (place in project root)
# Build context: root of repo (backend/ subfolder)
# ===================================================

# Build stage — use Maven + Java 21 LTS (matches target bytecode in pom.xml)
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy Maven Wrapper and pom.xml first to cache dependency layer
COPY backend/.mvn .mvn
COPY backend/mvnw .
COPY backend/mvnw.cmd .
COPY backend/pom.xml .

RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build
COPY backend/src ./src
RUN ./mvnw clean package -DskipTests -B

# Run stage — lightweight JRE
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
