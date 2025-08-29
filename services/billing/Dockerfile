# ---------- Build stage ----------
FROM gradle:8.10.1-jdk21-alpine AS builder
WORKDIR /src

# Keep dependency download layer stable
COPY settings.gradle.kts build.gradle.kts ./
# If you have gradle.properties, gradle/ wrapper etc, copy them too:
# COPY gradle.properties gradle/ ./

# Pre-warm Gradle deps (no sources yet)
RUN gradle --no-daemon dependencies || true

# Now copy sources and build
COPY src ./src
RUN gradle clean bootJar --no-daemon -x test

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-jammy

# Create non-root user
RUN useradd -ms /bin/bash appuser
WORKDIR /app

# Copy the built jar
COPY --from=builder /src/build/libs/*.jar /app/app.jar

# Optional: JVM runtime opts (can also be passed at runtime with ENV/JAVA_OPTS)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseZGC"

# Actuator healthcheck (works if you enabled Spring Boot actuator)
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD \
    bash -lc "command -v curl >/dev/null 2>&1 && curl -fsS http://127.0.0.1:8081/actuator/health || exit 1"

EXPOSE 8081
USER appuser
ENTRYPOINT ["bash","-lc","exec java $JAVA_OPTS -jar /app/app.jar"]
