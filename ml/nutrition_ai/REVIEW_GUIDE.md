# NutriCore Research And Review Guide

The Random Forest learns project suitability labels. The sources below inform
review criteria; none of these organizations rated our recipes or endorsed the
model. A completed human review remains separate from a generated label.

## Research Basis

- [WHO healthy-diet guidance](https://www.who.int/en/news-room/fact-sheets/detail/healthy-diet)
  emphasizes varied diets, fruit, vegetables, whole grains, and fibre. It gives
  daily goals, not a requirement for every individual meal. Macro totals alone
  cannot establish dietary quality or micronutrient adequacy.
- [ISSN protein and exercise position statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/)
  describes 1.4-2.0 g/kg/day as a general range for most healthy exercising
  individuals. This is not a universal prescription, a protein limit, or a reason
  to reject every meal below a particular protein amount. Medical conditions and
  the complete daily diet require individual assessment.
- [NIDDK Body Weight Planner](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner)
  illustrates individualized energy planning. Matching a computed calorie target
  does not demonstrate that the target is appropriate for the person.
- [FDA food-allergy guidance](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)
  covers ingredient labeling and allergen cross-contact. Our ingredient records
  cannot establish product-specific cross-contact safety. Milk/dairy, egg/eggs,
  and other common naming aliases are normalized in the exclusion filter.

## Reviewer Checklist

1. Check the full user profile, recorded allergies, and relevant medical context.
2. Check the calorie target against the complete day's intake and activity.
3. Assess protein and other nutrients in the whole-day context, not one meal.
4. Check variety, fruit/vegetables, and whole-grain choices. Do not assume missing
   fibre, sodium, or saturated-fat measurements are zero.
5. Read every ingredient, including milk, avocado, sauces, and add-ons. Missing
   fridge ingredients are shopping requirements, not automatically unhealthy.
6. Check gram quantities against the source preparation state. For example,
   rice may be dry/raw weight while chicken is cooked weight. Do not reuse the
   same grams after cooking or invent a conversion factor.
7. Rate the personalized recommendation 1-5 and explain changes. Record the real
   reviewer's identity and date only when that person actually reviews it.

## Rating Meaning

- 5: suitable for the supplied context, with no identified adjustment needed.
- 4: suitable with a minor adjustment or explicit condition.
- 3: uncertain, incomplete context, or requires meaningful revision.
- 2: poor fit for the supplied context; substantial changes needed.
- 1: incompatible with an explicit restriction or unsuitable as proposed.

These are project review definitions, not a clinically validated rating scale.
Ratings 4-5 can become positive training labels, 1-2 negative labels, and 3 is
omitted. Keep complete profiles separate for evaluation. Training ratings do not
change the database's manual meal approvals.

## Recipe Compatibility

Recipe names now list actual ingredients and instructions include weight bases.
Duplicate aliases are suppressed in recommendations, not deleted from the
catalog. Their stable IDs preserve existing approval references. Training
divides synthetic weight across aliases and labels equal scores consistently.
Stored plans are not rewritten; generate a new plan for updated instructions.
