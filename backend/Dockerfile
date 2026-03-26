FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy entire project
COPY . .

# Build the jar
RUN mvn clean package -DskipTests

# --------- Runtime Stage ----------
FROM eclipse-temurin:17-jdk

WORKDIR /app

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]