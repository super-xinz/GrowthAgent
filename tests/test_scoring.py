def opportunity_score(product_fit, solution_intent, usefulness, freshness, growth, visibility, community, history, risk):
    return (.25*product_fit+.20*solution_intent+.15*usefulness+.10*freshness+.10*growth+.08*visibility+.07*community+.05*history-risk)

def test_high_intent_beats_general_discussion():
    high=opportunity_score(1,1,.8,.8,.4,.5,.7,0,0)
    low=opportunity_score(.1,0,.4,.8,.7,.5,.7,0,0)
    assert high > low
    assert 0 <= high <= 1

def test_risk_penalty_can_force_below_zero_for_policy_clamp():
    assert opportunity_score(0,0,0,0,0,0,0,0,.5) < 0

