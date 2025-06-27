# 1. Base image: A slim Debian with pre-installed Python
FROM python:3.11-slim

# 2. Set working directory in container
WORKDIR /usr/src/app

# 3. Environment variable for better logging in Docker
ENV PYTHONUNBUFFERED=1

# 4. Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1

# 5. Install Python dependencies
# First copy the requirements file and install.
# Docker can cache this step, which speeds up the build when only the code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy all app code to working directory
COPY . .

# 7. Expose port on which the API will listen
EXPOSE ${PORT_PREDICTION}

# 8. Start command for the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3100"]
