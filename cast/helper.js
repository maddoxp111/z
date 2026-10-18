// A(handle, displayName, bio, followersMillions, kind, verified, postsPerDay, repliesPerDay, voice, topics, [exampleA, exampleB])
// ppd/rpd are the defaults for "how often they post / reply" (per simulated day). Tunable globally + per account in the Sim tab.
module.exports = (handle, name, bio, fM, kind, v, ppd, rpd, voice, topics, ex) => ({ handle, name, bio, followers: Math.round(fM * 1e6), kind, v, ppd, rpd, voice, topics, ex, activity: ppd });
