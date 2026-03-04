"""
Simple video compression script using imageio-ffmpeg
Reduces video bitrate to get files under GitHub's 100MB limit
"""
import os
import subprocess
import sys
from pathlib import Path

def get_file_size_mb(filepath):
    """Get file size in MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def compress_video_ffmpeg(input_path, output_path, bitrate="2000k"):
    """
    Compress video using ffmpeg via subprocess
    
    Args:
        input_path: Path to input video file
        output_path: Path to output video file  
        bitrate: Target video bitrate (e.g., "2000k" for 2Mbps)
    """
    try:
        original_size = get_file_size_mb(input_path)
        print(f"\nProcessing: {input_path}")
        print(f"Original size: {original_size:.2f} MB")
        
        # Use ffmpeg command
        cmd = [
            "ffmpeg",
            "-i", input_path,
            "-b:v", bitrate,
            "-b:a", "128k",
            "-c:v", "libx264",
            "-preset", "medium",
            "-c:a", "aac",
            "-y",
            output_path
        ]
        
        # Try with ffmpeg directly first
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0 and os.path.exists(output_path):
            compressed_size = get_file_size_mb(output_path)
            reduction = ((original_size - compressed_size) / original_size) * 100
            print(f"Compressed size: {compressed_size:.2f} MB")
            print(f"Reduction: {reduction:.1f}%")
            print(f"✓ Successfully compressed")
            return True
        else:
            print(f"✗ FFmpeg error: {result.stderr[:200]}")
            return False
            
    except FileNotFoundError:
        print("✗ FFmpeg not found. Trying alternative method...")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def compress_with_imageio(input_path, output_path, fps=30, preset="medium"):
    """
    Alternative compression using imageio-ffmpeg
    This is slower but more reliable on Windows
    """
    try:
        import imageio_ffmpeg
        import imageio
        
        print(f"\nProcessing with imageio: {input_path}")
        original_size = get_file_size_mb(input_path)
        print(f"Original size: {original_size:.2f} MB")
        
        # Read video
        reader = imageio.get_reader(input_path)
        fps_orig = reader.get_meta_data()['fps']
        
        # Write compressed video
        writer = imageio.get_writer(
            output_path,
            fps=fps,
            codec='libx264',
            pixelformat='yuv420p',
            quality=7  # Higher quality (1-10, lower is better)
        )
        
        frame_count = 0
        for frame in reader:
            writer.append_data(frame)
            frame_count += 1
            if frame_count % 30 == 0:
                print(f"  Processed {frame_count} frames...")
        
        writer.close()
        reader.close()
        
        compressed_size = get_file_size_mb(output_path)
        reduction = ((original_size - compressed_size) / original_size) * 100
        print(f"Compressed size: {compressed_size:.2f} MB")
        print(f"Reduction: {reduction:.1f}%")
        print(f"✓ Successfully compressed")
        return True
        
    except Exception as e:
        print(f"✗ Error with imageio: {e}")
        return False

def main():
    print("=" * 60)
    print("  VIDEO COMPRESSION TOOL FOR GITHUB COMPLIANCE")
    print("=" * 60)
    
    # Get the project root
    script_dir = Path(__file__).parent.resolve()
    os.chdir(script_dir)
    
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
    
    success_count = 0
    
    # Process each video
    for video in videos:
        if not os.path.exists(video["input"]):
            print(f"\n✗ File not found: {video['input']}")
            continue
        
        # Try ffmpeg first
        if compress_video_ffmpeg(video["input"], video["output"], video["bitrate"]):
            success_count += 1
        else:
            # Fall back to imageio
            if compress_with_imageio(video["input"], video["output"]):
                success_count += 1
    
    print("\n" + "=" * 60)
    print("COMPRESSION COMPLETE")
    print("=" * 60)
    print(f"Successfully compressed: {success_count}/{len(videos)} videos\n")
    
    print("📋 Next Steps:")
    print("-" * 60)
    print("1. Verify compressed videos play correctly:")
    print("   - Check quality and ensure no playback issues")
    print("")
    print("2. Replace original files with compressed versions:")
    print("   WINDOWS CMD:")
    for video in videos:
        print(f"   move /Y \"{video['output']}\" \"{video['input']}\"")
    print("")
    print("3. Commit and push to GitHub:")
    print("   git add .")
    print("   git commit -m 'Compress videos for GitHub compliance'")
    print("   git push origin main")
    print("")
    print("=" * 60)

if __name__ == "__main__":
    main()
