package com.autobahnrush.game;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

/**
 * Google Play Games services v2: sign-in, leaderboards and achievements.
 * Stays off until a real project id is set in res/values/games.xml.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private boolean ready = false;

    private boolean configured() {
        int id = getContext().getResources().getIdentifier("game_services_project_id", "string", getContext().getPackageName());
        if (id == 0) return false;
        String v = getContext().getString(id);
        return v != null && v.matches("\\d{6,}");
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!configured()) { JSObject r = new JSObject(); r.put("signedIn", false); r.put("reason", "not configured"); call.resolve(r); return; }
        if (!ready) { PlayGamesSdk.initialize(getContext()); ready = true; }
        PlayGames.getGamesSignInClient(getActivity()).isAuthenticated().addOnCompleteListener(t -> {
            boolean ok = t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated();
            if (ok) { JSObject r = new JSObject(); r.put("signedIn", true); call.resolve(r); return; }
            PlayGames.getGamesSignInClient(getActivity()).signIn().addOnCompleteListener(t2 -> {
                JSObject r = new JSObject(); r.put("signedIn", t2.isSuccessful() && t2.getResult() != null && t2.getResult().isAuthenticated()); call.resolve(r);
            });
        });
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        if (!ready) { call.reject("not signed in"); return; }
        PlayGames.getLeaderboardsClient(getActivity()).submitScore(call.getString("leaderboardId"), call.getLong("score", 0L));
        call.resolve();
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        if (!ready) { call.reject("not signed in"); return; }
        PlayGames.getAchievementsClient(getActivity()).unlock(call.getString("achievementId"));
        call.resolve();
    }

    @PluginMethod
    public void showLeaderboards(PluginCall call) {
        if (!ready) { call.reject("not signed in"); return; }
        PlayGames.getLeaderboardsClient(getActivity()).getAllLeaderboardsIntent().addOnSuccessListener(i -> { getActivity().startActivityForResult(i, 9001); call.resolve(); })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        if (!ready) { call.reject("not signed in"); return; }
        PlayGames.getAchievementsClient(getActivity()).getAchievementsIntent().addOnSuccessListener(i -> { getActivity().startActivityForResult(i, 9002); call.resolve(); })
            .addOnFailureListener(e -> call.reject(e.getMessage()));
    }
}
