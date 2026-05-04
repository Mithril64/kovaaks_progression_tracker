#![cfg_attr(not(feature = "desktop"), allow(dead_code))]

use crate::models::OnlineProfile;
use chrono::Utc;

pub fn resolve_online_profile(provider: String, handle: String) -> OnlineProfile {
    OnlineProfile {
        provider,
        handle,
        display_name: None,
        last_synced_at: Some(Utc::now().to_rfc3339()),
        status: "not_configured".to_string(),
    }
}
