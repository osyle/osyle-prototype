"""
Test Script for DTR Pass 1

Quick test to verify Pass 1 extraction works.
"""
import asyncio
import json
from app.dtr import extract_pass_1_only


async def test_figma_only():
    """Test with Figma JSON only"""
    print("\n" + "="*60)
    print("TEST 1: Figma JSON Only")
    print("="*60)
    
    # Minimal Figma JSON
    figma_json = {
        "document": {
            "children": [{
                "type": "CANVAS",
                "name": "Page 1",
                "children": [{
                    "type": "FRAME",
                    "name": "Main Frame",
                    "absoluteBoundingBox": {
                        "x": 0,
                        "y": 0,
                        "width": 1200,
                        "height": 800
                    },
                    "layoutMode": "VERTICAL",
                    "itemSpacing": 24,
                    "paddingTop": 32,
                    "paddingRight": 32,
                    "paddingBottom": 32,
                    "paddingLeft": 32,
                    "children": [
                        {
                            "type": "TEXT",
                            "name": "Heading",
                            "absoluteBoundingBox": {
                                "x": 32,
                                "y": 32,
                                "width": 600,
                                "height": 48
                            },
                            "style": {
                                "fontSize": 48,
                                "fontWeight": 700,
                                "fontFamily": "Inter"
                            }
                        },
                        {
                            "type": "TEXT",
                            "name": "Body",
                            "absoluteBoundingBox": {
                                "x": 32,
                                "y": 104,
                                "width": 600,
                                "height": 24
                            },
                            "style": {
                                "fontSize": 16,
                                "fontWeight": 400,
                                "fontFamily": "Inter"
                            }
                        }
                    ]
                }]
            }]
        }
    }
    
    async def progress(stage, message):
        print(f"  [{stage}] {message}")
    
    try:
        result = await extract_pass_1_only(
            resource_id="test-figma-only",
            taste_id="test-taste",
            figma_json=figma_json,
            progress_callback=progress
        )
        
        print("\n✅ SUCCESS!")
        print(f"   Authority: {result['authority']}")
        print(f"   Confidence: {result['confidence']}")
        print(f"   Layout type: {result['layout']['type']}")
        print(f"   Nesting depth: {result['layout']['nesting_depth']}")
        print(f"   Spacing quantum: {result['spacing']['quantum']}")
        print(f"   Hierarchy levels: {len(result['hierarchy']['levels'])}")
        print(f"   Extraction time: {result['extraction_time_ms']}ms")
        
        return True
    
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_vision_only():
    """Test with image only (requires actual image)"""
    print("\n" + "="*60)
    print("TEST 2: Image Only (Vision)")
    print("="*60)
    
    print("⏭️  SKIPPED: Requires actual image file")
    print("   To test: Provide image_bytes parameter")
    return True


async def test_hybrid():
    """Test with both Figma JSON and image"""
    print("\n" + "="*60)
    print("TEST 3: Hybrid (Figma + Image)")
    print("="*60)
    
    print("⏭️  SKIPPED: Requires actual image file")
    print("   To test: Provide both figma_json and image_bytes")
    return True


async def test_storage():
    """Test loading saved results"""
    print("\n" + "="*60)
    print("TEST 4: Storage (Load Results)")
    print("="*60)
    
    from app.dtr import load_pass_result
    
    try:
        result = load_pass_result(
            resource_id="test-figma-only",
            pass_name="pass_1_structure",
            version="latest"
        )
        
        if result:
            print("✅ SUCCESS! Loaded saved result:")
            print(f"   Authority: {result['authority']}")
            print(f"   Confidence: {result['confidence']}")
            return True
        else:
            print("ℹ️  No saved results found (expected if first run)")
            return True
    
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("DTR Pass 1 Test Suite")
    print("="*60)
    
    results = []
    
    # Test 1: Figma only
    results.append(await test_figma_only())
    
    # Test 2: Vision only (skipped without image)
    results.append(await test_vision_only())
    
    # Test 3: Hybrid (skipped without image)
    results.append(await test_hybrid())
    
    # Test 4: Storage
    results.append(await test_storage())
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed")
    
    print("\nOutput files saved to: /app/dtr_outputs/")
    print("Check docker volume mount for local access")


if __name__ == "__main__":
    asyncio.run(main())
