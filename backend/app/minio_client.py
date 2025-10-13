from minio import Minio
from minio.error import S3Error
from app.config import settings
from io import BytesIO
from typing import Optional


class MinIOClient:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                print(f"✓ MinIO bucket '{self.bucket_name}' created")
            else:
                print(f"✓ MinIO bucket '{self.bucket_name}' exists")
        except S3Error as e:
            print(f"✗ MinIO bucket error: {e}")
            raise
    
    async def upload_file(
        self,
        file_data: bytes,
        object_name: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Upload file to MinIO"""
        try:
            file_stream = BytesIO(file_data)
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_stream,
                length=len(file_data),
                content_type=content_type
            )
            return object_name
        except S3Error as e:
            print(f"✗ File upload error: {e}")
            raise
    
    async def get_file(self, object_name: str) -> Optional[bytes]:
        """Get file from MinIO"""
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            print(f"✗ File retrieval error: {e}")
            return None
    
    async def delete_file(self, object_name: str) -> bool:
        """Delete file from MinIO"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            print(f"✗ File deletion error: {e}")
            return False
    
    def get_presigned_url(self, object_name: str, expiry: int = 3600) -> str:
        """Get presigned URL for file access"""
        try:
            from datetime import timedelta
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expiry)
            )
            return url
        except S3Error as e:
            print(f"✗ Presigned URL error: {e}")
            raise


# Initialize MinIO client
minio_client = MinIOClient()
