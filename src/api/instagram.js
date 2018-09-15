const fetch = require('node-fetch')

const getInstagramProfileData = async (username) => {
  const text = await fetch(`https://instagram.com/${username}`).then(x => x.text())

  const regexExpr = /<script type="text\/javascript">window\._sharedData = (.*?);<\/script>/

  const matches = regexExpr.exec(text)[0]
    .replace('<script type="text/javascript">window._sharedData = ', '')
    .replace(';</script>', '')

  const jsonMatches = JSON.parse(matches)

  const edges = jsonMatches.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges

  const likedCount = edges.map(x => {
    try { return x.node.edge_liked_by.count } catch (e) { return '' }
  })
  const commentCount = edges.map(x => {
    try { return x.node.edge_media_to_comment.count } catch (e) { return '' }
  })
  const captions = edges.map(x => {
    try { return x.node.edge_media_to_caption.edges[0].node.text } catch (e) { return '' }
  })
  const pictures = edges.map(x => {
    try { return x.node.display_url } catch (e) { return '' }
  })

  return pictures.map((x, idx) => {
    return {
      likes: likedCount[idx],
      comments: commentCount[idx],
      caption: captions[idx],
      picture: pictures[idx]
    }
  })
}

const a = async () => {
  const d = await getInstagramProfileData('selenagomez')
  console.log(d)
}

a()
