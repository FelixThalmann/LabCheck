# 1. Base image: A slim Debian with pre-installed Python
FROM python:3.11-slim

# 2. Set working directory in container
WORKDIR /usr/src/app

# 3. Environment variable for better logging in Docker
ENV PYTHONUNBUFFERED=1

# 4. Install system dependencies: cron for regular training
RUN apt-get update && apt-get install -y --no-install-recommends cron libgomp1

# 5. Install Python dependencies
# First copy the requirements file and install.
# Docker can cache this step, which speeds up the build when only the code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy all app code to working directory
COPY . .

# 7. Set up cronjob
# Copy the crontab file and give it the right permissions
COPY crontab /etc/cron.d/training-cron
RUN chmod 0644 /etc/cron.d/training-cron
# Apply the crontab so the cron daemon knows about it
RUN crontab /etc/cron.d/training-cron

# 8. Expose port on which the API will listen
EXPOSE ${PORT_PREDICTION}

# 9. Start command for the container
# Start the cron service in the background AND the FastAPI application in the foreground.
# This way both periodic training and the API run.
CMD sh -c "cron && uvicorn app.main:app --host 0.0.0.0 --port ${PORT_PREDICTION:-3100}"
