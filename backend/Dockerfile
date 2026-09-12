# Render: set Root Directory = backend, or Docker context = this folder.
# Runtime Java 17 to match pom.xml. Render injects PORT.

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package \
    && cp target/*.jar /tmp/app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --uid 1001 appuser \
    && mkdir -p /app && chown -R appuser:app /app

COPY --from=build --chown=appuser:app /tmp/app.jar /app/app.jar

USER appuser

EXPOSE 8080

ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
