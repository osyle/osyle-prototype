"""
DTM Workflow Integration
Automatically builds/updates DTM when resources are added to a taste
"""

async def handle_dtr_built(user_id: str, taste_id: str, resource_id: str, llm_service):
    """
    Handle DTR build completion - build or update DTM
    
    Call this after successfully building a DTR in build_dtr endpoint
    
    Args:
        user_id: User ID
        taste_id: Taste ID
        resource_id: Resource ID (newly built DTR)
        llm_service: LLM service instance
    """
    from app.dtm_builder import DTMBuilder
    from app.dtm_updater import DTMIncrementalUpdater
    from app import storage, db
    
    # Count resources with DTRs in this taste
    resources = db.list_resources_for_taste(taste_id)
    resources_with_dtrs = []
    
    for resource in resources:
        if storage.resource_dtr_exists(user_id, taste_id, resource["resource_id"]):
            resources_with_dtrs.append(resource)
    
    dtr_count = len(resources_with_dtrs)
    print(f"\nDTM Workflow: {dtr_count} DTRs in taste {taste_id}")
    
    if dtr_count == 1:
        # First resource - no DTM yet
        print("→ First resource, no DTM needed yet")
        return {"action": "none", "reason": "First resource"}
    
    elif dtr_count == 2:
        # Second resource - BUILD initial DTM
        print("→ Second resource detected - BUILDING initial DTM...")
        
        try:
            # Load both DTRs
            dtrs = []
            for resource in resources_with_dtrs:
                dtr = storage.get_resource_dtr(
                    user_id,
                    taste_id,
                    resource["resource_id"]
                )
                if dtr:
                    dtrs.append(dtr)
            
            # Build DTM
            builder = DTMBuilder(llm_service)
            dtm = await builder.build_dtm(
                dtrs=dtrs,
                taste_id=taste_id,
                owner_id=user_id,
                use_llm=True
            )
            
            # Save DTM
            storage.put_taste_dtm(user_id, taste_id, dtm)
            
            print(f"✓ Initial DTM built successfully (confidence: {dtm['meta']['overall_confidence']:.2f})")
            
            return {
                "action": "built",
                "total_resources": dtr_count,
                "confidence": dtm["meta"]["overall_confidence"]
            }
        
        except Exception as e:
            print(f"✗ DTM build failed: {e}")
            return {"action": "failed", "error": str(e)}
    
    else:
        # Third+ resource - UPDATE DTM incrementally
        print(f"→ Resource #{dtr_count} detected - UPDATING DTM incrementally...")
        
        try:
            # Get existing DTM
            dtm = storage.get_taste_dtm(user_id, taste_id)
            
            if not dtm:
                # DTM missing, rebuild from scratch
                print("⚠ DTM not found, rebuilding from scratch...")
                return await handle_dtr_built(user_id, taste_id, resource_id, llm_service)
            
            # Get new DTR
            new_dtr = storage.get_resource_dtr(user_id, taste_id, resource_id)
            
            # Incremental update (code-only, fast)
            updater = DTMIncrementalUpdater()
            updated_dtm = await updater.update_dtm(
                existing_dtm=dtm,
                new_dtr=new_dtr,
                resynthesize_semantic=False  # Fast update
            )
            
            # Save updated DTM
            storage.put_taste_dtm(user_id, taste_id, updated_dtm)
            
            print(f"✓ DTM updated incrementally (confidence: {updated_dtm['meta']['overall_confidence']:.2f})")
            
            return {
                "action": "updated",
                "total_resources": dtr_count,
                "confidence": updated_dtm["meta"]["overall_confidence"]
            }
        
        except Exception as e:
            print(f"✗ DTM update failed: {e}")
            return {"action": "failed", "error": str(e)}
