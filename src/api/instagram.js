const fetch = require('node-fetch')

const getInstagramProfileData = async (profileName) => {
  const text = await fetch(`https://instagram.com/${profileName}`).then(x => x.text())

  const regexExpr = /<script type="text\/javascript">window\._sharedData = (.*?);<\/script>/

  const matches = regexExpr.exec(text)[0]
    .replace('<script type="text/javascript">window._sharedData = ', '')
    .replace(';</script>', '')

  const jsonMatches = JSON.parse(matches)

  const edges = jsonMatches.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges

  const likedCount = edges.map(x => x.node.edge_liked_by.count)
  const commentCount = edges.map(x => x.node.edge_media_to_comment.count)
  const captions = edges.map(x => x.node.edge_media_to_caption.edges[0].node.text)
  const pictures = edges.map(x => x.node.display_url)

  return pictures.map((x, idx) => {
    return {
      likes: likedCount[idx],
      comments: commentCount[idx],
      caption: captions[idx],
      picture: pictures[idx]
    }
  })
}

// const main = async () => {
//   const d = await getInstagramProfileData('sadgxrly')
//   console.log(d)
// }

// main()

module.exports = { getInstagramProfileData }
