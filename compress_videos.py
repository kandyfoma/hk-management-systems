"""
Video compression script using moviepy
"""
import os
import sys
from pathlib import Path

def install_moviepy():
    """Install moviepy if not already installed"""
    try:
        import moviepy.editor as mpy
        print("moviepy is already installed")
        return True
    except ImportError:
        print("Installing moviepy...")
        os.system(f"{sys.executable} -m pip install moviepy")
        return True

def compress_video(input_path, output_path, target_bitrate="2000k"):
    """
    Compress video using moviepy
    
    Args:
        input_path: Path to input video
        output_path: Path to output video
        target_bitrate: Target bitrate (e.g., "2000k" for 2Mbps)
    """
    try:
        from moviepy.editor import VideoFileClip
        import os
        
        # Get original size
        original_size = os.path.getsize(input_path) / (1024 * 1024)  # MB
        print(f"Processing: {input_path}")
        print(f"Original size: {original_size:.2f} MB")
        
        # Load video
        video = VideoFileClip(input_path)
        
        # Calculate bitrate from string (e.g., "2000k" -> 2000)
        bitrate = target_bitrate.replace("k", "")
        
        # Write with compression
        video.write_videofile(
            output_path,
            bitrate=target_bitrate,
            audio_bitrate="128k",
            codec="libx264",
            audio_codec="aac",
            verbose=True,
            logger=None
        )
        
        # Get compressed size
        compressed_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
        reduction = ((original_size - compressed_size) / original_size) * 100
        
        print(f"Compressed size: {compressed_size:.2f} MB")
        print(f"Reduction: {reduction:.1f}%")
        print()
        
        return True
        
    except Exception as e:
        print(f"Error compressing {input_path}: {e}")
        return False

def main():
    print("=" * 50)
    print("Video Compression Tool (Python)")
    print("=" * 50)
    print()
    
    # Install moviepy
    install_moviepy()
    print()
    
    # Change to project directory
    project_dir = Path(__file__).parent
    os.chdir(project_dir)
    
    # Videos to compress
    videos = [
        {
            "input": "frontend/website/public/videos/hero-bg-4k.mp4",
            "output": "frontend/website/public/videos/hero-bg-4k-compressed.mp4",
            "bitrate": "2000k"
        },
        {
            "input": "frontend/assets/Images/9310125-uhd_3840_2160_30fps.mp4",
            "output": "frontend/assets/Images/9310125-uhd_3840_2160_30fps-compressed.mp4",
            "bitrate": "2500k"
        }
    ]
    
    # Process videos
    for video in videos:
        if os.path.exists(video["input"]):
            compress_video(video["input"], video["output"], video["bitrate"])
        else:
            print(f"File not found: {video['input']}")
            print()
    
    print("=" * 50)
    print("Compression Complete!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("1. Review the compressed videos to ensure quality is acceptable")
    print("2. Replace the original files:")
    print("   cp frontend/website/public/videos/hero-bg-4k-compressed.mp4")
    print("      frontend/website/public/videos/hero-bg-4k.mp4")
    print("3. Update your code to use the compressed versions")
    print("4. Commit and push to GitHub")

if __name__ == "__main__":
    main()
