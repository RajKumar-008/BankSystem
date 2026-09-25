# Build stage
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first and download dependencies to cache them
# This makes future Render deployments MUCH faster!
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the rest of the source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage (Lightweight Production Image)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
